export type UserRole = "public" | "admin" | "super_admin";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

export interface AdminEmail {
  email: string;
  added_by: string | null;
  created_at: string;
}
