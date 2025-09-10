import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, checkSupabaseConfig } from '@/lib/supabase'

// POST /api/routes/optimize
// Generate optimized patrol routes for officers
export async function POST(request: NextRequest) {
  try {
    const config = checkSupabaseConfig()
    if (!config.isConfigured) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { officer_id } = body

    if (!officer_id) {
      return NextResponse.json(
        { error: 'Missing required field: officer_id' },
        { status: 400 }
      )
    }

    // Verify officer exists and is admin
    const { data: officer, error: officerError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('id', officer_id)
      .eq('role', 'admin')
      .single()

    if (officerError || !officer) {
      return NextResponse.json(
        { error: 'Invalid officer_id or insufficient permissions' },
        { status: 404 }
      )
    }

    // Try to use the Supabase function first
    try {
      const { data, error } = await supabaseAdmin.rpc('optimize_patrol_route', {
        officer_id
      })

      if (!error && data && data.length > 0) {
        const routeData = data[0]
        
        // Save the optimized route
        const { data: savedRoute, error: saveError } = await supabaseAdmin
          .from('patrol_routes')
          .insert({
            officer_id,
            route_data: routeData.route,
            status: 'pending'
          })
          .select()
          .single()

        if (saveError) {
          throw saveError
        }

        return NextResponse.json({
          success: true,
          data: {
            route_id: savedRoute.id,
            route: routeData.route,
            estimated_time: routeData.estimated_time,
            officer_email: officer.email,
            created_at: savedRoute.created_at,
            status: 'pending'
          }
        })
      }
    } catch (funcError) {
      console.error('Supabase function error, using fallback:', funcError)
    }

    // Fallback: Generate route using simple algorithm
    const optimizedRoute = await generateFallbackRoute(officer_id)

    // Save the route
    const { data: savedRoute, error: saveError } = await supabaseAdmin
      .from('patrol_routes')
      .insert({
        officer_id,
        route_data: optimizedRoute.route,
        status: 'pending'
      })
      .select()
      .single()

    if (saveError) {
      throw saveError
    }

    return NextResponse.json({
      success: true,
      data: {
        route_id: savedRoute.id,
        route: optimizedRoute.route,
        estimated_time: optimizedRoute.estimated_time,
        officer_email: officer.email,
        created_at: savedRoute.created_at,
        status: 'pending'
      }
    })

  } catch (error) {
    console.error('Error optimizing route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/routes/optimize?officer_id=xxx
// Get existing routes for an officer
export async function GET(request: NextRequest) {
  try {
    const config = checkSupabaseConfig()
    if (!config.isConfigured) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const officer_id = searchParams.get('officer_id')
    const status = searchParams.get('status')

    if (!officer_id) {
      return NextResponse.json(
        { error: 'Missing officer_id parameter' },
        { status: 400 }
      )
    }

    let query = supabaseAdmin
      .from('patrol_routes')
      .select(`
        id,
        officer_id,
        route_data,
        status,
        created_at,
        users!inner(email)
      `)
      .eq('officer_id', officer_id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: routes, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: routes?.map(route => ({
        route_id: route.id,
        route: route.route_data,
        status: route.status,
        officer_email: route.users.email,
        created_at: route.created_at
      })) || []
    })

  } catch (error) {
    console.error('Error fetching routes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Fallback route optimization algorithm
async function generateFallbackRoute(officer_id: string) {
  try {
    // Get violation hotspots from the last 24 hours
    const { data: violations, error: violationsError } = await supabaseAdmin
      .from('violations')
      .select(`
        lot_id,
        parking_lots!inner(id, name, location)
      `)
      .eq('status', 'flagged')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (violationsError) {
      throw violationsError
    }

    // Count violations per lot
    const violationCounts = new Map()
    violations?.forEach(v => {
      const count = violationCounts.get(v.lot_id) || 0
      violationCounts.set(v.lot_id, count + 1)
    })

    // Get all lots with violation counts
    const { data: allLots, error: lotsError } = await supabaseAdmin
      .from('parking_lots')
      .select('id, name, location')

    if (lotsError) {
      throw lotsError
    }

    // Create route stops with priorities
    const routeStops = allLots?.map(lot => ({
      lot_id: lot.id,
      lot_name: lot.name,
      location: lot.location,
      violation_count: violationCounts.get(lot.id) || 0,
      priority: violationCounts.get(lot.id) > 5 ? 'high' :
               violationCounts.get(lot.id) > 2 ? 'medium' : 'low',
      estimated_time: 10 + (violationCounts.get(lot.id) || 0) * 2 // Base 10 min + 2 min per violation
    })) || []

    // Sort by violation count (highest first)
    routeStops.sort((a, b) => b.violation_count - a.violation_count)

    // Take top 6 lots for the route
    const selectedStops = routeStops.slice(0, 6)

    const totalTime = selectedStops.reduce((sum, stop) => sum + stop.estimated_time, 0) + 
                     (selectedStops.length - 1) * 5 // 5 minutes travel time between stops

    return {
      route: {
        stops: selectedStops,
        start_time: new Date().toISOString(),
        officer_id,
        total_stops: selectedStops.length,
        high_priority_stops: selectedStops.filter(s => s.priority === 'high').length
      },
      estimated_time: totalTime
    }

  } catch (error) {
    console.error('Error generating fallback route:', error)
    
    // Ultimate fallback - return a basic route
    return {
      route: {
        stops: [],
        start_time: new Date().toISOString(),
        officer_id,
        total_stops: 0,
        high_priority_stops: 0
      },
      estimated_time: 0
    }
  }
}