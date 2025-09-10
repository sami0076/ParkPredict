import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// Runtime check for valid configuration
export function checkSupabaseConfig() {
  const hasValidUrl = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url' &&
                      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  const hasValidAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
                          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your_supabase_anon_key' &&
                          !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder')
  const hasValidServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY && 
                             process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your_supabase_service_role_key' &&
                             !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')
  
  return {
    isConfigured: hasValidUrl && hasValidAnonKey && hasValidServiceKey,
    hasValidUrl,
    hasValidAnonKey,
    hasValidServiceKey
  }
}

// Get Supabase client - only create if properly configured
export function getSupabaseClient() {
  const config = checkSupabaseConfig()
  if (!config.hasValidUrl || !config.hasValidAnonKey) {
    throw new Error('Supabase client not properly configured')
  }
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Get Supabase admin client - only create if properly configured
export function getSupabaseAdminClient() {
  const config = checkSupabaseConfig()
  if (!config.hasValidUrl || !config.hasValidServiceKey) {
    throw new Error('Supabase admin client not properly configured')
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Default exports for backward compatibility (will throw if not configured)
export const supabase = (() => {
  try {
    return getSupabaseClient()
  } catch {
    // Return a mock client for build time
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder'
    )
  }
})()

export const supabaseAdmin = (() => {
  try {
    return getSupabaseAdminClient()
  } catch {
    // Return a mock client for build time
    return createClient(
      'https://placeholder.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.placeholder'
    )
  }
})()

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'driver' | 'admin'
          permit_type: string | null
          preferences: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: 'driver' | 'admin'
          permit_type?: string | null
          preferences?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'driver' | 'admin'
          permit_type?: string | null
          preferences?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      parking_lots: {
        Row: {
          id: string
          name: string
          capacity: number
          current_occupancy: number
          location: {
            lat: number
            lng: number
          }
          permit_restrictions: string[]
          amenities: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          capacity: number
          current_occupancy?: number
          location: {
            lat: number
            lng: number
          }
          permit_restrictions?: string[]
          amenities?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          capacity?: number
          current_occupancy?: number
          location?: {
            lat: number
            lng: number
          }
          permit_restrictions?: string[]
          amenities?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      occupancy_history: {
        Row: {
          id: string
          lot_id: string
          occupancy_count: number
          timestamp: string
          source: 'sensor' | 'manual' | 'prediction'
        }
        Insert: {
          id?: string
          lot_id: string
          occupancy_count: number
          timestamp?: string
          source: 'sensor' | 'manual' | 'prediction'
        }
        Update: {
          id?: string
          lot_id?: string
          occupancy_count?: number
          timestamp?: string
          source?: 'sensor' | 'manual' | 'prediction'
        }
      }
      violations: {
        Row: {
          id: string
          lot_id: string
          license_plate: string
          violation_type: string
          timestamp: string
          officer_id: string | null
          status: 'flagged' | 'cited' | 'dismissed'
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lot_id: string
          license_plate: string
          violation_type: string
          timestamp?: string
          officer_id?: string | null
          status?: 'flagged' | 'cited' | 'dismissed'
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lot_id?: string
          license_plate?: string
          violation_type?: string
          timestamp?: string
          officer_id?: string | null
          status?: 'flagged' | 'cited' | 'dismissed'
          image_url?: string | null
          created_at?: string
        }
      }
      campus_events: {
        Row: {
          id: string
          name: string
          location: string
          start_time: string
          end_time: string
          expected_attendance: number
          impact_radius: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          location: string
          start_time: string
          end_time: string
          expected_attendance: number
          impact_radius: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          location?: string
          start_time?: string
          end_time?: string
          expected_attendance?: number
          impact_radius?: number
          created_at?: string
        }
      }
      patrol_routes: {
        Row: {
          id: string
          officer_id: string
          route_data: any
          created_at: string
          status: 'pending' | 'in_progress' | 'completed'
        }
        Insert: {
          id?: string
          officer_id: string
          route_data: any
          created_at?: string
          status?: 'pending' | 'in_progress' | 'completed'
        }
        Update: {
          id?: string
          officer_id?: string
          route_data?: any
          created_at?: string
          status?: 'pending' | 'in_progress' | 'completed'
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      predict_occupancy: {
        Args: {
          lot_id: string
          prediction_time: string
        }
        Returns: {
          predicted_occupancy: number
          confidence: number
        }
      }
      optimize_patrol_route: {
        Args: {
          officer_id: string
        }
        Returns: {
          route: any
          estimated_time: number
        }
      }
    }
    Enums: {
      user_role: 'driver' | 'admin'
      violation_status: 'flagged' | 'cited' | 'dismissed'
      route_status: 'pending' | 'in_progress' | 'completed'
    }
  }
}