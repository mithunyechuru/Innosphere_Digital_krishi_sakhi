

import { UserProfile, Language } from '../types';

// Extend UserProfile for internal storage
export interface UserRecord extends UserProfile {
  createdAt: number;
}

const DB_KEY = 'innosphere_users_db';
const SESSION_KEY = 'innosphere_user';
const LAST_PHONE_KEY = 'innosphere_last_phone';

export const authService = {
  // --- Database Operations (Simulated with LocalStorage) ---

  getAllUsers: (): UserRecord[] => {
    try {
      const usersStr = localStorage.getItem(DB_KEY);
      return usersStr ? JSON.parse(usersStr) : [];
    } catch (e) {
      return [];
    }
  },

  findUserByPhone: (phone: string): UserRecord | undefined => {
    const users = authService.getAllUsers();
    return users.find((u) => u.phone === phone);
  },

  saveNewUser: (user: UserRecord): void => {
    const users = authService.getAllUsers();
    users.push(user);
    localStorage.setItem(DB_KEY, JSON.stringify(users));
  },

  updateUser: (phone: string, updates: Partial<UserRecord>): UserRecord => {
    const users = authService.getAllUsers();
    const index = users.findIndex(u => u.phone === phone);
    
    if (index === -1) {
      throw new Error("User not found");
    }

    const updatedUser = { ...users[index], ...updates };
    users[index] = updatedUser;
    
    localStorage.setItem(DB_KEY, JSON.stringify(users));
    authService.createSession(updatedUser); // Update active session
    return updatedUser;
  },

  // --- Auth Operations ---

  // Simplified Registration: Name + Phone Only
  register: (data: { name: string; phone: string; language: Language }) => {
    const existingUser = authService.findUserByPhone(data.phone);
    if (existingUser) {
      throw new Error("User already registered. Please Login.");
    }

    const newUser: UserRecord = {
      name: data.name,
      phone: data.phone,
      language: data.language,
      // Default location, user will set this up in profile
      location: { lat: 21.1458, lng: 79.0882, city: "" },
      createdAt: Date.now(),
      hasSeenTour: false
    };

    authService.saveNewUser(newUser);
    authService.createSession(newUser);
    // Remember phone number for next login
    localStorage.setItem(LAST_PHONE_KEY, data.phone);
    return newUser;
  },

  // Request OTP (Mock)
  requestOtp: (phone: string) => {
    // In a real app, trigger SMS API here.
    // For demo, we just return success.
    return { success: true, otp: '1234' }; 
  },

  // Verify OTP
  verifyOtp: (otp: string) => {
    // Basic verification for demo
    if (otp !== '1234') {
      throw new Error("Invalid OTP. Please enter '1234'.");
    }
    return true;
  },

  // Login after OTP verification
  loginUser: (phone: string) => {
      const user = authService.findUserByPhone(phone);
      if (!user) {
          throw new Error("Account not found. Please Sign Up.");
      }
      authService.createSession(user);
      // Remember phone number for next login
      localStorage.setItem(LAST_PHONE_KEY, phone);
      return user;
  },

  // --- Session Management ---

  createSession: (user: UserRecord) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  getSession: (): UserProfile | null => {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    return sessionStr ? JSON.parse(sessionStr) : null;
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  // Retrieve last used phone number
  getLastPhone: (): string | null => {
    return localStorage.getItem(LAST_PHONE_KEY);
  }
};