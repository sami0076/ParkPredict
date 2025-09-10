import { supabase } from './supabase'

export interface UserProfile {
  id: string
  email: string
  role: 'driver' | 'admin'
  permit_type: string | null
  preferences: any | null
}

// Get user profile from Supabase (client-side)
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

// Update user profile in Supabase (client-side)
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// Sync user profile with Supabase (client-side)
export async function syncUserProfile(clerkUser: any, role: 'driver' | 'admin' = 'driver') {
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', clerkUser.id)
      .single();

    const userProfile = {
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      role: existingUser?.role || role,
      permit_type: existingUser?.permit_type || null,
      preferences: existingUser?.preferences || null,
      updated_at: new Date().toISOString()
    };

    if (existingUser) {
      // Update existing user
      const { error } = await supabase
        .from('users')
        .update(userProfile)
        .eq('id', clerkUser.id);

      if (error) throw error;
    } else {
      // Create new user
      const { error } = await supabase
        .from('users')
        .insert({
          ...userProfile,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    }

    return userProfile;
  } catch (error) {
    console.error('Error syncing user profile:', error);
    throw error;
  }
}