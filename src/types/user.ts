export type UserRole = "admin" | "user" | "public" | "super_admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "user";
  created_at: string;
  updated_at?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  role: UserRole;
  created_at: string;
}

export interface AdminEmail {
  email: string;
  added_by: string | null;
  created_at: string;
}

