import { supabase } from './lib/supabase';

export type UserRole = 'student' | 'staff';

export interface AllowedUser {
  email: string;
  name: string;
  role: UserRole;
  course?: string;
}

type UserRegistryEntry = {
  name: string;
  role: UserRole;
  course?: string;
};

// Role and profile registry only.
// Passwords must be stored and verified by Supabase Authentication, not this file.
export const ALLOWED_USERS: Record<string, UserRegistryEntry> = {
  // === STUDENTS REGISTERED ===
  'tanzhelam@graduate.utm.my': {
    name: 'TAN ZHE LAM',
    role: 'student',
    course: '3/SKELH',
  },
  'yongshun@graduate.utm.my': {
    name: 'YONG QIAN SHUN',
    role: 'student',
    course: '3/SKEEH',
  },
  'lijiajin@graduate.utm.my': {
    name: 'LI JIA JIN',
    role: 'student',
    course: '3/SKELH',
  },
  'syahmi@graduate.utm.my': {
    name: 'MUHAMMAD SYAHMI BIN ALI',
    role: 'student',
    course: '3/SKEMH',
  },
  'divya@graduate.utm.my': {
    name: 'DIVYA A/P RAMAN',
    role: 'student',
    course: '1/SKEEH',
  },
  'student1@graduate.utm.my': {
    name: 'TEST STUDENT ONE',
    role: 'student',
    course: '2/SKELH',
  },

  // === STAFF MEMBERS REGISTERED ===
  'naqiyah@graduate.utm.my': {
    name: 'Verification Log Sync Operator: NAQIYAH',
    role: 'staff',
  },
  'aminah@utm.my': {
    name: 'PUAN AMINAH BINTI SULAIMAN',
    role: 'staff',
  },
  'khairul@utm.my': {
    name: 'DR. KHAIRUL ANUAR',
    role: 'staff',
  },
  'noraziah@utm.my': {
    name: 'PUAN NORAZIAH BINTI HASSAN',
    role: 'staff',
  },
  'asri@utm.my': {
    name: 'INCIK MOHD ASRI',
    role: 'staff',
  },
  'staff1@utm.my': {
    name: 'LAB OFFICER ONE',
    role: 'staff',
  },
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function registryUserFromEmail(email: string): AllowedUser | null {
  const normalizedEmail = normalizeEmail(email);
  const registryUser = ALLOWED_USERS[normalizedEmail];

  if (!registryUser) return null;

  return {
    email: normalizedEmail,
    name: registryUser.name,
    role: registryUser.role,
    course: registryUser.course,
  };
}

/**
 * Supabase Auth login.
 * This replaces the old hardcoded password check.
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<AllowedUser | null> {
  const normalizedEmail = normalizeEmail(email);

  if (!ALLOWED_USERS[normalizedEmail]) {
    return null;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    console.error('Supabase login failed:', error.message);
    return null;
  }

  return registryUserFromEmail(normalizedEmail);
}

/**
 * Reads the currently logged-in Supabase user and maps it to your app role.
 * Use this on app refresh so users stay logged in.
 */
export async function getCurrentAuthenticatedUser(): Promise<AllowedUser | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.email) {
    return null;
  }

  return registryUserFromEmail(data.user.email);
}

export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Supabase sign out failed:', error.message);
  }
}

/**
 * Sends Supabase forgot-password email.
 * The redirect URL must be added in Supabase Auth URL settings.
 */
export async function sendPasswordResetEmail(email: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const normalizedEmail = normalizeEmail(email);

  if (!ALLOWED_USERS[normalizedEmail]) {
    return {
      ok: false,
      message: 'This email is not registered in the lab inventory system.',
    };
  }

  const redirectTo = `${window.location.origin}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });

  if (error) {
    console.error('Supabase password reset failed:', error.message);
    return {
      ok: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    message: 'Password reset email sent. Please check your inbox.',
  };
}

/**
 * Call this on your reset-password page after the user opens the Supabase reset link.
 */
export async function updateCurrentUserPassword(newPassword: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Supabase update password failed:', error.message);
    return {
      ok: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    message: 'Password updated successfully. You can now log in with the new password.',
  };
}

/**
 * Deprecated compatibility function.
 * Password changes are now handled by Supabase Auth, not local code.
 */
export function updateUserPasswordInRegistry(): boolean {
  console.warn('updateUserPasswordInRegistry is disabled. Use Supabase password reset instead.');
  return false;
}
