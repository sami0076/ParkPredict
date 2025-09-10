import { auth, currentUser } from "@clerk/nextjs/server";
import { User } from "@clerk/nextjs/server";
import { supabaseAdmin } from './supabase'

export interface UserProfile {
  id: string
  email: string
  role: 'driver' | 'admin'
  permit_type: string | null
  preferences: any | null
}

// Get current user from Clerk (server-side)
export async function getCurrentUser(): Promise<User | null> {
  return await currentUser();
}

// Get current user ID from Clerk auth (server-side)
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

// Check if user is authenticated (server-side)
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

// Get user profile from Supabase (using Clerk user ID) - server-side
export async function getUserProfile(userId?: string): Promise<UserProfile | null> {
  const clerkUserId = userId || await getCurrentUserId();
  if (!clerkUserId) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', clerkUserId)
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

// Create or update user profile in Supabase when user signs up/in - server-side
export async function syncUserProfile(clerkUser: User, role: 'driver' | 'admin' = 'driver') {
  try {
    const { data: existingUser } = await supabaseAdmin
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
      const { error } = await supabaseAdmin
        .from('users')
        .update(userProfile)
        .eq('id', clerkUser.id);

      if (error) throw error;
    } else {
      // Create new user
      const { error } = await supabaseAdmin
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

// Update user profile in Supabase - server-side
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  try {
    const { data, error } = await supabaseAdmin
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

// Check if user has required role - server-side
export async function requireRole(role: 'driver' | 'admin'): Promise<UserProfile> {
  const user = await requireAuth();
  const profile = await getUserProfile(user.id);
  
  if (!profile || profile.role !== role) {
    throw new Error(`${role} role required`);
  }
  
  return profile;
}

// Check if user is admin - server-side
export async function isAdmin(): Promise<boolean> {
  try {
    const profile = await getUserProfile();
    return profile?.role === 'admin';
  } catch {
    return false;
  }
}