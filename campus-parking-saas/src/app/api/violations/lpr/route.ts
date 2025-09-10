import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, checkSupabaseConfig } from '@/lib/supabase'

// POST /api/violations/lpr
// Endpoint for License Plate Recognition (LPR) cameras to report violations
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
    const { 
      lot_id, 
      license_plate, 
      violation_type, 
      camera_id, 
      image_url,
      timestamp,
      confidence_score 
    } = body

    // Validate required fields
    if (!lot_id || !license_plate || !violation_type) {
      return NextResponse.json(
        { error: 'Missing required fields: lot_id, license_plate, violation_type' },
        { status: 400 }
      )
    }

    // Verify the lot exists
    const { data: lot, error: lotError } = await supabaseAdmin
      .from('parking_lots')
      .select('id, name, permit_restrictions')
      .eq('id', lot_id)
      .single()

    if (lotError || !lot) {
      return NextResponse.json(
        { error: 'Invalid lot_id' },
        { status: 404 }
      )
    }

    // Check if this is a duplicate violation (same plate, same lot, within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data: existingViolation } = await supabaseAdmin
      .from('violations')
      .select('id')
      .eq('lot_id', lot_id)
      .eq('license_plate', license_plate)
      .eq('violation_type', violation_type)
      .gte('timestamp', oneHourAgo)
      .limit(1)

    if (existingViolation && existingViolation.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Duplicate violation ignored',
        duplicate: true
      })
    }

    // Create the violation record
    const { data: violation, error: violationError } = await supabaseAdmin
      .from('violations')
      .insert({
        lot_id,
        license_plate: license_plate.toUpperCase(),
        violation_type,
        timestamp: timestamp || new Date().toISOString(),
        status: 'flagged',
        image_url: image_url || null
      })
      .select()
      .single()

    if (violationError) {
      throw violationError
    }

    // Log the detection for analytics
    console.log(`Violation detected: ${license_plate} in ${lot.name} for ${violation_type}`)

    return NextResponse.json({
      success: true,
      message: 'Violation recorded successfully',
      data: {
        violation_id: violation.id,
        lot_name: lot.name,
        license_plate,
        violation_type,
        status: 'flagged',
        timestamp: violation.timestamp
      }
    })

  } catch (error) {
    console.error('Error recording violation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/violations/lpr
// Get recent violations for monitoring
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
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')
    const lot_id = searchParams.get('lot_id')

    let query = supabaseAdmin
      .from('violations')
      .select(`
        id,
        lot_id,
        license_plate,
        violation_type,
        timestamp,
        status,
        image_url,
        parking_lots!inner(name)
      `)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    if (lot_id) {
      query = query.eq('lot_id', lot_id)
    }

    const { data: violations, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: violations?.map(v => ({
        id: v.id,
        lot_id: v.lot_id,
        lot_name: v.parking_lots.name,
        license_plate: v.license_plate,
        violation_type: v.violation_type,
        timestamp: v.timestamp,
        status: v.status,
        image_url: v.image_url
      })) || []
    })

  } catch (error) {
    console.error('Error fetching violations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}