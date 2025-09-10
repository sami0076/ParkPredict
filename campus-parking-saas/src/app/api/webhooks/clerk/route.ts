import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { getSupabaseAdminClient, checkSupabaseConfig } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occurred', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data

    try {
      const config = checkSupabaseConfig()
      if (!config.isConfigured) {
        return new Response('Supabase not configured', { status: 503 })
      }

      const supabaseAdmin = getSupabaseAdminClient()
      // Create user profile in Supabase
      const { error } = await supabaseAdmin
        .from('users')
        .insert({
          id: id,
          email: email_addresses[0]?.email_address || '',
          role: 'driver', // Default role
          permit_type: null,
          preferences: {
            preferCovered: false,
            needEvCharging: false,
            needHandicapAccess: false,
            maxWalkingDistance: 500
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error creating user profile:', error)
        return new Response('Error creating user profile', { status: 500 })
      }

      console.log(`User profile created for ${email_addresses[0]?.email_address}`)
    } catch (error) {
      console.error('Error in user.created webhook:', error)
      return new Response('Error processing webhook', { status: 500 })
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses } = evt.data

    try {
      const config = checkSupabaseConfig()
      if (!config.isConfigured) {
        return new Response('Supabase not configured', { status: 503 })
      }

      const supabaseAdmin = getSupabaseAdminClient()
      // Update user profile in Supabase
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          email: email_addresses[0]?.email_address || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Error updating user profile:', error)
        return new Response('Error updating user profile', { status: 500 })
      }

      console.log(`User profile updated for ${email_addresses[0]?.email_address}`)
    } catch (error) {
      console.error('Error in user.updated webhook:', error)
      return new Response('Error processing webhook', { status: 500 })
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    try {
      const config = checkSupabaseConfig()
      if (!config.isConfigured) {
        return new Response('Supabase not configured', { status: 503 })
      }

      const supabaseAdmin = getSupabaseAdminClient()
      // Delete user profile from Supabase
      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting user profile:', error)
        return new Response('Error deleting user profile', { status: 500 })
      }

      console.log(`User profile deleted for user ${id}`)
    } catch (error) {
      console.error('Error in user.deleted webhook:', error)
      return new Response('Error processing webhook', { status: 500 })
    }
  }

  return new Response('', { status: 200 })
}