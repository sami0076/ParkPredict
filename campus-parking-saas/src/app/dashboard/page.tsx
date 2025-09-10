'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, signOut } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getParkingRecommendation, getOccupancyStatus } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Database } from '@/lib/supabase'

type ParkingLot = Database['public']['Tables']['parking_lots']['Row']
type UserProfile = Database['public']['Tables']['users']['Row']

export default function DriverDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([])
  const [filteredLots, setFilteredLots] = useState<ParkingLot[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPermit, setSelectedPermit] = useState<string>('all')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    checkUser()
    fetchParkingLots()
    getUserLocation()
  }, [])

  useEffect(() => {
    filterLots()
  }, [parkingLots, searchTerm, selectedPermit, profile])

  useEffect(() => {
    if (userLocation && filteredLots.length > 0 && profile) {
      const recs = getParkingRecommendation(
        filteredLots,
        userLocation,
        profile.permit_type || 'student',
        profile.preferences
      )
      setRecommendations(recs.slice(0, 3)) // Top 3 recommendations
    }
  }, [filteredLots, userLocation, profile])

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/auth/login')
        return
      }
      setUser(currentUser)
      
      const userProfile = await getUserProfile(currentUser.id)
      setProfile(userProfile)
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchParkingLots = async () => {
    try {
      const { data, error } = await supabase
        .from('parking_lots')
        .select('*')
        .order('name')

      if (error) throw error
      setParkingLots(data || [])
    } catch (error) {
      console.error('Error fetching parking lots:', error)
    }
  }

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting location:', error)
          // Default to campus center
          setUserLocation({ lat: 40.7128, lng: -74.0060 })
        }
      )
    } else {
      // Default to campus center
      setUserLocation({ lat: 40.7128, lng: -74.0060 })
    }
  }

  const filterLots = () => {
    let filtered = parkingLots

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(lot =>
        lot.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by permit type
    if (selectedPermit !== 'all' && profile) {
      filtered = filtered.filter(lot =>
        lot.permit_restrictions.includes(selectedPermit) ||
        lot.permit_restrictions.length === 0
      )
    }

    setFilteredLots(filtered)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const openInMaps = (lot: ParkingLot) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lot.location.lat},${lot.location.lng}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Parking Dashboard</h1>
              <p className="text-gray-600">Welcome back, {profile?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              {profile?.role === 'admin' && (
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin')}
                >
                  Admin Dashboard
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => router.push('/profile')}
              >
                Profile
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recommended for You</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recommendations.map((lot, index) => {
                const status = getOccupancyStatus(lot.current_occupancy, lot.capacity)
                return (
                  <Card key={lot.id} className="border-2 border-blue-200">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center">
                            {lot.name}
                            {index === 0 && (
                              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Best Match
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {Math.round(lot.distance)}m away • {lot.availableSpots} spots available
                          </CardDescription>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs ${status.bgColor} ${status.color}`}>
                          {status.status}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-2xl font-bold">
                          {lot.availableSpots}/{lot.capacity}
                        </div>
                        <div className="text-sm text-gray-600">
                          {Math.round((lot.current_occupancy / lot.capacity) * 100)}% full
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div
                          className={`h-2 rounded-full ${
                            lot.current_occupancy / lot.capacity > 0.9
                              ? 'bg-red-500'
                              : lot.current_occupancy / lot.capacity > 0.7
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${(lot.current_occupancy / lot.capacity) * 100}%` }}
                        ></div>
                      </div>
                      {lot.amenities.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-1">Amenities:</p>
                          <div className="flex flex-wrap gap-1">
                            {lot.amenities.map((amenity: string) => (
                              <span
                                key={amenity}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                              >
                                {amenity.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <Button
                        className="w-full"
                        onClick={() => openInMaps(lot)}
                      >
                        Get Directions
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search parking lots..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="sm:w-48">
            <select
              value={selectedPermit}
              onChange={(e) => setSelectedPermit(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All Permits</option>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="staff">Staff</option>
              <option value="visitor">Visitor</option>
            </select>
          </div>
        </div>

        {/* All Parking Lots */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">All Parking Lots</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLots.map((lot) => {
              const status = getOccupancyStatus(lot.current_occupancy, lot.capacity)
              const availableSpots = lot.capacity - lot.current_occupancy
              
              return (
                <Card key={lot.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{lot.name}</CardTitle>
                        <CardDescription>
                          {availableSpots} spots available
                        </CardDescription>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${status.bgColor} ${status.color}`}>
                        {status.status}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-2xl font-bold">
                        {availableSpots}/{lot.capacity}
                      </div>
                      <div className="text-sm text-gray-600">
                        {Math.round((lot.current_occupancy / lot.capacity) * 100)}% full
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div
                        className={`h-2 rounded-full ${
                          lot.current_occupancy / lot.capacity > 0.9
                            ? 'bg-red-500'
                            : lot.current_occupancy / lot.capacity > 0.7
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${(lot.current_occupancy / lot.capacity) * 100}%` }}
                      ></div>
                    </div>
                    
                    {lot.permit_restrictions.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Permits:</p>
                        <div className="flex flex-wrap gap-1">
                          {lot.permit_restrictions.map((permit: string) => (
                            <span
                              key={permit}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                            >
                              {permit}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {lot.amenities.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Amenities:</p>
                        <div className="flex flex-wrap gap-1">
                          {lot.amenities.map((amenity: string) => (
                            <span
                              key={amenity}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {amenity.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Button
                      className="w-full"
                      onClick={() => openInMaps(lot)}
                    >
                      Get Directions
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {filteredLots.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47.881-6.072 2.328C7.788 17.787 9.79 18 12 18s4.212-.213 6.072-.672z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No parking lots found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}