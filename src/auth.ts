export type UserRole = 'student' | 'staff';



export interface AllowedUser {

  email: string;

  name: string;

  role: UserRole;

  course?: string;

}



// 6+ Verified Student and Staff Accounts Registry Database with Individual Passwords

export const ALLOWED_USERS: Record<string, { name: string; role: UserRole; password?: string; course?: string }> = {

  // === STUDENTS REGISTERED (6 Accounts) ===

  'tanzhelam@graduate.utm.my': { name: 'TAN ZHE LAM', role: 'student', password: 'ZZ', course: '3/SKELH' },

  'yongshun@graduate.utm.my': { name: 'YONG QIAN SHUN', role: 'student', password: 'qq', course: '3/SKEEH' },

  'lijiajin@graduate.utm.my': { name: 'LI JIA JIN', role: 'student', password: 'jj', course: '3/SKELH' },

  'syahmi@graduate.utm.my': { name: 'MUHAMMAD SYAHMI BIN ALI', role: 'student', password: 'stud_syahmi2026', course: '3/SKEMH' },

  'divya@graduate.utm.my': { name: 'DIVYA A/P RAMAN', role: 'student', password: 'stud_divya2026', course: '1/SKEEH' },

  'student1@graduate.utm.my': { name: 'TEST STUDENT ONE', role: 'student', password: 'student1password', course: '2/SKELH' },



  // === STAFF MEMBERS REGISTERED (6 Accounts) ===

  'naqiyah@graduate.utm.my': { name: 'Verification Log Sync Operator: NAQIYAH', role: 'staff', password: 'nn' },

  'aminah@utm.my': { name: 'PUAN AMINAH BINTI SULAIMAN', role: 'staff', password: 'staff_aminah2026' },

  'khairul@utm.my': { name: 'DR. KHAIRUL ANUAR', role: 'staff', password: 'staff_khairul2026' },

  'noraziah@utm.my': { name: 'PUAN NORAZIAH BINTI HASSAN', role: 'staff', password: 'staff_noraziah2026' },

  'asri@utm.my': { name: 'INCIK MOHD ASRI', role: 'staff', password: 'staff_asri2026' },

  'staff1@utm.my': { name: 'LAB OFFICER ONE', role: 'staff', password: 'staff1password' },

};



/**

 * Validates credentials submitted via the login page against the mapping values

 */

export function verifyCredentials(email: string, password: string): AllowedUser | null {

  const normalizedEmail = email.trim().toLowerCase();

  const user = ALLOWED_USERS[normalizedEmail];



  // Securely check if user exists and their submitted password matches their recorded password value

  if (user && user.password === password) {

    return {

      email: normalizedEmail,

      name: user.name,

      role: user.role,

      course: user.course

    };

  }



  return null;

}



/**

 * Dynamically rewrites account registry passcode keys to synchronize with Forgot Password recovery mechanisms

 */

export function updateUserPasswordInRegistry(email: string, newPassword: string): boolean {

  const normalizedEmail = email.trim().toLowerCase();

  if (ALLOWED_USERS[normalizedEmail]) {

    ALLOWED_USERS[normalizedEmail].password = newPassword;

    return true;

  }

  return false;

}