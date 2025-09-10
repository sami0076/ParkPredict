'use client'

import { useState, useEffect } from 'react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
import { useRouter } from 'next/navigation'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { getUserProfile, syncUserProfile } from '@/lib/clerk-auth-client'
import { supabase } from '@/lib/supabase'
import { formatDate, getOccupancyStatus } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Database } from '@/lib/supabase'

type ParkingLot = Database['public']['Tables']['parking_lots']['Row']
type Violation = Database['public']['Tables']['violations']['Row']
type UserProfile = Database['public']['Tables']['users']['Row']

export default function AdminDashboard() {
  const { user: clerkUser, isLoaded } = useUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [stats, setStats] = useState({
    totalSpots: 0,
    occupiedSpots: 0,
    availableSpots: 0,
    occupancyRate: 0,
    totalViolations: 0,
    flaggedViolations: 0,
    citedViolations: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const router = useRouter()

  useEffect(() => {
    if (isLoaded) {
      if (!clerkUser) {
        router.push('/')
        return
      }
      checkUser()
    }
  }, [isLoaded, clerkUser])

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData()
    }
  }, [profile])

  const checkUser = async () => {
    try {
      if (!clerkUser) return
      
      // Sync user profile with Supabase
      await syncUserProfile(clerkUser)
      
      // Get user profile from Supabase
      const userProfile = await getUserProfile(clerkUser.id)
      if (!userProfile || userProfile.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      setProfile(userProfile)
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async () => {
    try {
      // Fetch parking lots
      const { data: lotsData, error: lotsError } = await supabase
        .from('parking_lots')
        .select('*')
        .order('name')

      if (lotsError) throw lotsError
      setParkingLots(lotsData || [])

      // Fetch violations
      const { data: violationsData, error: violationsError } = await supabase
        .from('violations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (violationsError) throw violationsError
      setViolations(violationsData || [])

      // Calculate stats
      if (lotsData) {
        const totalSpots = lotsData.reduce((sum, lot) => sum + lot.capacity, 0)
        const occupiedSpots = lotsData.reduce((sum, lot) => sum + lot.current_occupancy, 0)
        const availableSpots = totalSpots - occupiedSpots
        const occupancyRate = totalSpots > 0 ? (occupiedSpots / totalSpots) * 100 : 0

        const totalViolations = violationsData?.length || 0
        const flaggedViolations = violationsData?.filter(v => v.status === 'flagged').length || 0
        const citedViolations = violationsData?.filter(v => v.status === 'cited').length || 0

        setStats({
          totalSpots,
          occupiedSpots,
          availableSpots,
          occupancyRate,
          totalViolations,
          flaggedViolations,
          citedViolations
        })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const updateViolationStatus = async (violationId: string, newStatus: 'flagged' | 'cited' | 'dismissed') => {
    try {
      const { error } = await supabase
        .from('violations')
        .update({ status: newStatus })
        .eq('id', violationId)

      if (error) throw error

      // Refresh violations
      setViolations(prev => prev.map(v => 
        v.id === violationId ? { ...v, status: newStatus } : v
      ))

      // Recalculate stats
      const updatedViolations = violations.map(v => 
        v.id === violationId ? { ...v, status: newStatus } : v
      )
      const flaggedViolations = updatedViolations.filter(v => v.status === 'flagged').length
      const citedViolations = updatedViolations.filter(v => v.status === 'cited').length

      setStats(prev => ({
        ...prev,
        flaggedViolations,
        citedViolations
      }))
    } catch (error) {
      console.error('Error updating violation:', error)
    }
  }

  // Remove handleSignOut function as we'll use Clerk's SignOutButton

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
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Campus Parking Management</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
              >
                Driver View
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/profile')}
              >
                Profile
              </Button>
              <SignOutButton>
                <Button variant="outline">
                  Sign Out
                </Button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Parking Spots</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSpots}</div>
              <p className="text-xs text-muted-foreground">
                Across {parkingLots.length} lots
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Occupancy</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <rect width="20" height="14" x="2" y="5" rx="2"/>
                  <path d="M2 10h20"/>
                </svg>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.occupiedSpots}</div>
              <p className="text-xs text-muted-foreground">
                {stats.occupancyRate.toFixed(1)}% occupied
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Spots</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 2v20m8-10H4"/>
                </svg>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.availableSpots}</div>
              <p className="text-xs text-muted-foreground">
                Ready for parking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Violations</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.flaggedViolations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalViolations} total violations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'lots', label: 'Parking Lots' },
              { id: 'violations', label: 'Violations' },
              { id: 'analytics', label: 'Analytics' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Violations */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Violations</CardTitle>
                <CardDescription>Latest parking violations detected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {violations.slice(0, 5).map((violation) => (
                    <div key={violation.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{violation.license_plate}</p>
                        <p className="text-sm text-gray-600">{violation.violation_type}</p>
                        <p className="text-xs text-gray-500">{formatDate(violation.created_at)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          violation.status === 'flagged' ? 'bg-red-100 text-red-800' :
                          violation.status === 'cited' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {violation.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Lot Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Lot Status Overview</CardTitle>
                <CardDescription>Current occupancy across all lots</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {parkingLots.slice(0, 5).map((lot) => {
                    const status = getOccupancyStatus(lot.current_occupancy, lot.capacity)
                    const occupancyRate = (lot.current_occupancy / lot.capacity) * 100
                    
                    return (
                      <div key={lot.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{lot.name}</span>
                          <span className="text-sm text-gray-600">
                            {lot.current_occupancy}/{lot.capacity}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              occupancyRate > 90 ? 'bg-red-500' :
                              occupancyRate > 70 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${occupancyRate}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'lots' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parkingLots.map((lot) => {
              const status = getOccupancyStatus(lot.current_occupancy, lot.capacity)
              const availableSpots = lot.capacity - lot.current_occupancy
              const occupancyRate = (lot.current_occupancy / lot.capacity) * 100
              
              return (
                <Card key={lot.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{lot.name}</CardTitle>
                        <CardDescription>
                          {availableSpots} of {lot.capacity} spots available
                        </CardDescription>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${status.bgColor} ${status.color}`}>
                        {status.status}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Occupancy</span>
                          <span>{occupancyRate.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              occupancyRate > 90 ? 'bg-red-500' :
                              occupancyRate > 70 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${occupancyRate}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {lot.permit_restrictions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Permits:</p>
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
                        <div>
                          <p className="text-sm font-medium mb-1">Amenities:</p>
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
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {activeTab === 'violations' && (
          <Card>
            <CardHeader>
              <CardTitle>Violation Management</CardTitle>
              <CardDescription>Review and manage parking violations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {violations.map((violation) => (
                  <div key={violation.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-lg">{violation.license_plate}</h4>
                        <p className="text-gray-600">{violation.violation_type}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          violation.status === 'flagged' ? 'bg-red-100 text-red-800' :
                          violation.status === 'cited' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {violation.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Time:</span> {formatDate(violation.timestamp)}
                      </div>
                      <div>
                        <span className="font-medium">Lot:</span> {
                          parkingLots.find(lot => lot.id === violation.lot_id)?.name || 'Unknown'
                        }
                      </div>
                    </div>
                    
                    {violation.status === 'flagged' && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => updateViolationStatus(violation.id, 'cited')}
                        >
                          Issue Citation
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateViolationStatus(violation.id, 'dismissed')}
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Violation Trends</CardTitle>
                <CardDescription>Violation statistics by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="font-medium">Flagged Violations</span>
                    <span className="text-2xl font-bold text-red-600">{stats.flaggedViolations}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="font-medium">Cited Violations</span>
                    <span className="text-2xl font-bold text-yellow-600">{stats.citedViolations}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Total Violations</span>
                    <span className="text-2xl font-bold text-gray-600">{stats.totalViolations}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Occupancy Insights</CardTitle>
                <CardDescription>Current parking utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {stats.occupancyRate.toFixed(1)}%
                    </div>
                    <p className="text-gray-600">Overall Occupancy Rate</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{stats.availableSpots}</div>
                      <p className="text-sm text-gray-600">Available</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{stats.occupiedSpots}</div>
                      <p className="text-sm text-gray-600">Occupied</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}