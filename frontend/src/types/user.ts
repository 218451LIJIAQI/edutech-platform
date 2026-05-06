import type { TeacherProfile } from './teacher';
import { UserRole } from './enums';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: UserRole;
  readonly avatar?: string;
  readonly isActive: boolean;
  readonly isLocked?: boolean;
  readonly phone?: string;
  readonly address?: string;
  readonly department?: string;
  readonly lastLoginAt?: string;
  readonly loginCount?: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly teacherProfile?: TeacherProfile;
}

export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken?: string;
}

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

export interface RegisterData {
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: UserRole;
}
