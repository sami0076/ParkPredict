'use client'

import { useState, useEffect } from 'react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
import { useRouter } from 'next/navigation'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { getUserProfile, updateUserProfile, syncUserProfile } from '@/lib/clerk-auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Database } from '@/lib/supabase'

type UserProfile = Database['public']['Tables']['users']['Row']

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [permitType, setPermitType] = useState('')
  const [preferences, setPreferences] = useState({
    preferCovered: false,
    needEvCharging: false,
    needHandicapAccess: false,
    maxWalkingDistance: 500
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
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

  const checkUser = async () => {
    try {
      if (!clerkUser) return
      
      // Sync user profile with Supabase
      await syncUserProfile(clerkUser)
      
      // Get user profile from Supabase
      const userProfile = await getUserProfile(clerkUser.id)
      if (userProfile) {
        setProfile(userProfile)
        setPermitType(userProfile.permit_type || '')
        setPreferences(userProfile.preferences || {
          preferCovered: false,
          needEvCharging: false,
          needHandicapAccess: false,
          maxWalkingDistance: 500
        })
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    setMessage('')

    try {
      await updateUserProfile(profile.id, {
        permit_type: permitType,
        preferences
      })
      setMessage('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage('Error updating profile. Please try again.')
    } finally {
      setSaving(false)
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
              <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-gray-600">Manage your account and preferences</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
              >
                Back to Dashboard
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your basic account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  value={clerkUser?.emailAddresses[0]?.emailAddress || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <Input
                  value={profile?.role || ''}
                  disabled
                  className="bg-gray-50 capitalize"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Role cannot be changed
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permit Type
                </label>
                <select
                  value={permitType}
                  onChange={(e) => setPermitType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select permit type</option>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="staff">Staff</option>
                  <option value="visitor">Visitor</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Parking Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Parking Preferences</CardTitle>
              <CardDescription>
                Customize your parking recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="preferCovered"
                    checked={preferences.preferCovered}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      preferCovered: e.target.checked
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="preferCovered" className="ml-2 block text-sm text-gray-900">
                    Prefer covered parking
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="needEvCharging"
                    checked={preferences.needEvCharging}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      needEvCharging: e.target.checked
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="needEvCharging" className="ml-2 block text-sm text-gray-900">
                    Need EV charging station
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="needHandicapAccess"
                    checked={preferences.needHandicapAccess}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      needHandicapAccess: e.target.checked
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="needHandicapAccess" className="ml-2 block text-sm text-gray-900">
                    Need handicap accessible parking
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum walking distance (meters)
                </label>
                <Input
                  type="number"
                  value={preferences.maxWalkingDistance}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    maxWalkingDistance: parseInt(e.target.value) || 500
                  })}
                  min="100"
                  max="2000"
                  step="50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current: {preferences.maxWalkingDistance}m
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-center">
          <div className="text-center">
            {message && (
              <div className={`mb-4 p-3 rounded-md text-sm ${
                message.includes('Error') 
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-green-50 text-green-600 border border-green-200'
              }`}>
                {message}
              </div>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
              className="px-8"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Account Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible account actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Sign out of your account</h4>
                <p className="text-sm text-gray-600">You'll need to sign in again to access your account.</p>
              </div>
              <SignOutButton>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Sign Out
                </Button>
              </SignOutButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}