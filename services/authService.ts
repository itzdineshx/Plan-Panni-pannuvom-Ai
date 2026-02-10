import { AcademicLevel, AppUser } from '../types';

const USERS_KEY = 'Plan Panni Pannuvom_users';
const SESSION_KEY = 'Plan Panni Pannuvom_session';

interface AuthSession {
  userId: string;
}

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getUsers(): AppUser[] {
  return readJson<AppUser[]>(USERS_KEY, []);
}

export function getUserById(userId: string): AppUser | null {
  return getUsers().find(user => user.id === userId) || null;
}

export function signUpUser(input: {
  fullName: string;
  email: string;
  password: string;
  academicLevel?: AcademicLevel;
  department?: string;
  headline?: string;
}): AppUser {
  const users = getUsers();
  const normalizedEmail = input.email.trim().toLowerCase();

  if (users.some(user => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const newUser: AppUser = {
    id: Math.random().toString(36).slice(2, 10),
    fullName: input.fullName.trim(),
    email: normalizedEmail,
    password: input.password,
    academicLevel: input.academicLevel || AcademicLevel.UG,
    department: input.department || 'CSE',
    headline: input.headline || 'UG - CSE Final Year',
    avatarUrl: `https://picsum.photos/seed/${encodeURIComponent(normalizedEmail)}/64/64`,
  };

  users.push(newUser);
  writeJson(USERS_KEY, users);
  writeJson<AuthSession>(SESSION_KEY, { userId: newUser.id });

  return newUser;
}

export function loginUser(email: string, password: string): AppUser {
  const users = getUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user || user.password !== password) {
    throw new Error('Invalid email or password.');
  }

  writeJson<AuthSession>(SESSION_KEY, { userId: user.id });
  return user;
}

export function getCurrentUser(): AppUser | null {
  const session = readJson<AuthSession | null>(SESSION_KEY, null);
  if (!session?.userId) return null;
  return getUserById(session.userId);
}

export function logoutUser(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function updateUserProfile(userId: string, updates: Partial<AppUser>): AppUser {
  const users = getUsers();
  const idx = users.findIndex(user => user.id === userId);
  if (idx === -1) {
    throw new Error('User not found.');
  }

  const updated: AppUser = {
    ...users[idx],
    ...updates,
  };

  users[idx] = updated;
  writeJson(USERS_KEY, users);
  return updated;
}

export function getTeamMemberNames(): string[] {
  return getUsers().map(user => user.fullName).filter(Boolean);
}
