import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, checkSupabaseConfig } from '@/lib/supabase'

// POST /api/predictions/occupancy
// Generate occupancy predictions for parking lots
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
    const { lot_id, prediction_time } = body

    if (!lot_id) {
      return NextResponse.json(
        { error: 'Missing required field: lot_id' },
        { status: 400 }
      )
    }

    const targetTime = prediction_time ? new Date(prediction_time) : new Date(Date.now() + 30 * 60 * 1000) // Default: 30 minutes from now

    // Call the Supabase function for prediction
    const { data, error } = await supabaseAdmin.rpc('predict_occupancy', {
      lot_id,
      prediction_time: targetTime.toISOString()
    })

    if (error) {
      throw error
    }

    // Get lot information
    const { data: lot, error: lotError } = await supabaseAdmin
      .from('parking_lots')
      .select('name, capacity')
      .eq('id', lot_id)
      .single()

    if (lotError || !lot) {
      return NextResponse.json(
        { error: 'Lot not found' },
        { status: 404 }
      )
    }

    const prediction = data[0] || { predicted_occupancy: 0, confidence: 0.3 }

    return NextResponse.json({
      success: true,
      data: {
        lot_id,
        lot_name: lot.name,
        capacity: lot.capacity,
        predicted_occupancy: prediction.predicted_occupancy,
        predicted_availability: lot.capacity - prediction.predicted_occupancy,
        confidence: prediction.confidence,
        prediction_time: targetTime.toISOString(),
        occupancy_rate: (prediction.predicted_occupancy / lot.capacity) * 100
      }
    })

  } catch (error) {
    console.error('Error generating prediction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/predictions/occupancy?lot_id=xxx&hours=24
// Get occupancy predictions for the next N hours
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
    const hours = parseInt(searchParams.get('hours') || '6')

    if (!lot_id) {
      return NextResponse.json(
        { error: 'Missing lot_id parameter' },
        { status: 400 }
      )
    }

    // Get lot information
    const { data: lot, error: lotError } = await supabaseAdmin
      .from('parking_lots')
      .select('name, capacity')
      .eq('id', lot_id)
      .single()

    if (lotError || !lot) {
      return NextResponse.json(
        { error: 'Lot not found' },
        { status: 404 }
      )
    }

    // Generate predictions for each hour
    const predictions = []
    const now = new Date()

    for (let i = 1; i <= hours; i++) {
      const predictionTime = new Date(now.getTime() + i * 60 * 60 * 1000)
      
      try {
        const { data, error } = await supabaseAdmin.rpc('predict_occupancy', {
          lot_id,
          prediction_time: predictionTime.toISOString()
        })

        if (error) {
          console.error(`Prediction error for hour ${i}:`, error)
          continue
        }

        const prediction = data[0] || { predicted_occupancy: 0, confidence: 0.3 }

        predictions.push({
          time: predictionTime.toISOString(),
          hour_offset: i,
          predicted_occupancy: prediction.predicted_occupancy,
          predicted_availability: lot.capacity - prediction.predicted_occupancy,
          confidence: prediction.confidence,
          occupancy_rate: (prediction.predicted_occupancy / lot.capacity) * 100
        })
      } catch (err) {
        console.error(`Error predicting for hour ${i}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        lot_id,
        lot_name: lot.name,
        capacity: lot.capacity,
        predictions,
        generated_at: now.toISOString()
      }
    })

  } catch (error) {
    console.error('Error generating predictions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Simple fallback prediction algorithm when Supabase function isn't available
function generateSimplePrediction(historicalData: any[], targetTime: Date, capacity: number) {
  const hour = targetTime.getHours()
  const dayOfWeek = targetTime.getDay()
  
  // Basic patterns based on typical campus schedules
  let baseOccupancy = capacity * 0.3 // Default 30%
  
  // Peak hours (9 AM - 3 PM on weekdays)
  if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour <= 15) {
    baseOccupancy = capacity * 0.8
  }
  // Evening hours (6 PM - 10 PM)
  else if (hour >= 18 && hour <= 22) {
    baseOccupancy = capacity * 0.6
  }
  // Weekend adjustments
  else if (dayOfWeek === 0 || dayOfWeek === 6) {
    baseOccupancy = capacity * 0.4
  }
  
  // Add some randomness
  const variation = (Math.random() - 0.5) * 0.2 * capacity
  const predicted = Math.max(0, Math.min(capacity, Math.round(baseOccupancy + variation)))
  
  return {
    predicted_occupancy: predicted,
    confidence: 0.6
  }
}