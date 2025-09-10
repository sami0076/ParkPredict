import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient, checkSupabaseConfig } from '@/lib/supabase'

// POST /api/sensors/occupancy
// Endpoint for IoT sensors to report parking lot occupancy changes
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
    const { lot_id, occupancy_count, sensor_id, timestamp } = body

    // Validate required fields
    if (!lot_id || occupancy_count === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: lot_id, occupancy_count' },
        { status: 400 }
      )
    }

    // Verify the lot exists
    const supabaseAdmin = getSupabaseAdminClient()
    const { data: lot, error: lotError } = await supabaseAdmin
      .from('parking_lots')
      .select('id, capacity')
      .eq('id', lot_id)
      .single()

    if (lotError || !lot) {
      return NextResponse.json(
        { error: 'Invalid lot_id' },
        { status: 404 }
      )
    }

    // Validate occupancy count doesn't exceed capacity
    if (occupancy_count > lot.capacity) {
      return NextResponse.json(
        { error: 'Occupancy count exceeds lot capacity' },
        { status: 400 }
      )
    }

    // Update the parking lot's current occupancy
    const { error: updateError } = await supabaseAdmin
      .from('parking_lots')
      .update({ 
        current_occupancy: occupancy_count,
        updated_at: new Date().toISOString()
      })
      .eq('id', lot_id)

    if (updateError) {
      throw updateError
    }

    // Record the occupancy history
    const { error: historyError } = await supabaseAdmin
      .from('occupancy_history')
      .insert({
        lot_id,
        occupancy_count,
        timestamp: timestamp || new Date().toISOString(),
        source: 'sensor'
      })

    if (historyError) {
      console.error('Error recording occupancy history:', historyError)
      // Don't fail the request if history recording fails
    }

    return NextResponse.json({
      success: true,
      message: 'Occupancy updated successfully',
      data: {
        lot_id,
        occupancy_count,
        capacity: lot.capacity,
        availability: lot.capacity - occupancy_count
      }
    })

  } catch (error) {
    console.error('Error updating occupancy:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/sensors/occupancy?lot_id=xxx
// Get current occupancy for a specific lot
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
    const lot_id = searchParams.get('lot_id')

    if (!lot_id) {
      return NextResponse.json(
        { error: 'Missing lot_id parameter' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdminClient()
    const { data: lot, error } = await supabaseAdmin
      .from('parking_lots')
      .select('id, name, capacity, current_occupancy, updated_at')
      .eq('id', lot_id)
      .single()

    if (error || !lot) {
      return NextResponse.json(
        { error: 'Lot not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        lot_id: lot.id,
        name: lot.name,
        capacity: lot.capacity,
        current_occupancy: lot.current_occupancy,
        availability: lot.capacity - lot.current_occupancy,
        last_updated: lot.updated_at
      }
    })

  } catch (error) {
    console.error('Error fetching occupancy:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}