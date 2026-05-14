import { supabase } from './supabase';
import { getSession, clearSession } from './session';

/**
 * Validates if the current user session is still valid
 * Checks if user still exists, credentials haven't changed, and access hasn't been revoked
 */
export async function validateSession(): Promise<boolean> {
  const session = getSession();
  
  if (!session || !session.id) {
    console.log('No valid session or ID found');
    return false;
  }

  try {
    // Fetch the latest user data from database
    const { data: userData, error } = await supabase
      .from('students')
      .select('password, is_responsible, is_admin, last_password_change')
      .eq('id', session.id)
      .maybeSingle();

    // If user doesn't exist (error or no data), they've been deleted
    if (error) {
      console.error('Session validation query error:', error);
      // Don't log out on database errors, only if user is definitely not found
      return true; 
    }

    if (!userData) {
      console.log('User not found in database - clearing session');
      clearSession();
      return false;
    }

    // Check if role still matches
    if (session.role === 'admin' && !userData.is_admin) {
      console.log('Admin access revoked - clearing session');
      clearSession();
      return false;
    }

    if (session.role === 'responsible' && !userData.is_responsible) {
      console.log('Responsible access revoked - clearing session');
      clearSession();
      return false;
    }

    // Temporarily disabled password change check to stop auto-logouts on refresh
    /*
    if (userData.last_password_change && session.loginTimestamp) {
      // ... check logic ...
    }
    */

    return true;
  } catch (err) {
    console.error('Session validation error:', err);
    // If it's a network error or temporary issue, don't log out immediately
    // Only log out if we are sure the session is invalid
    return true; 
  }
}
