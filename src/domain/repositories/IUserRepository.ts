import { User } from '../entities/User';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name?: string | null;
  disclaimerAccepted: boolean;
  role?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  disclaimerAccepted?: boolean;
  role?: string;
  avatarUrl?: string | null;
}

export interface PaginatedUsers {
  data: User[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export abstract class IUserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findAll(opts: { limit: number; offset: number }): Promise<PaginatedUsers>;
  abstract create(userData: CreateUserData): Promise<User>;
  abstract update(id: string, updates: UpdateUserData): Promise<User | null>;
  abstract delete(id: string): Promise<void>;
}
