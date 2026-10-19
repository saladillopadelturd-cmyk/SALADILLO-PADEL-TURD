import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY in environment variables"
    );
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const ROOT_ADMIN_EMAILS = [
  "matiasvidal11972@gmail.com",
  "saladillopadelturd@gmail.com",
];

/**
 * Valida de forma estricta si el usuario que realiza la petición es un administrador autorizado.
 * Verifica:
 * 1. Sesión activa en Supabase Auth vía Cookies (SSR)
 * 2. Cabecera 'x-admin-email' o query/body contra la tabla 'profiles' (role: admin/super_admin) y ROOT_ADMIN_EMAILS
 */
export async function verifyIsAdmin(
  request: Request
): Promise<{ isAdmin: boolean; email?: string; userId?: string }> {
  // 1. Comprobar sesión de usuario autenticado en Supabase
  try {
    const serverClient = await createServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (user && user.email) {
      const email = user.email.toLowerCase().trim();
      if (ROOT_ADMIN_EMAILS.includes(email)) {
        return { isAdmin: true, email, userId: user.id };
      }

      const adminSb = createAdminClient();
      const { data: profile } = await adminSb
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && (profile.role === "admin" || profile.role === "super_admin")) {
        return { isAdmin: true, email, userId: user.id };
      }
    }
  } catch {
    // Si no hay cookies o sesión SSR, continuar a verificación por cabecera
  }

  // 2. Comprobar cabecera 'x-admin-email'
  const headerEmail = request.headers.get("x-admin-email")?.toLowerCase().trim();
  if (headerEmail) {
    if (ROOT_ADMIN_EMAILS.includes(headerEmail)) {
      return { isAdmin: true, email: headerEmail };
    }

    try {
      const adminSb = createAdminClient();
      const { data: profile } = await adminSb
        .from("profiles")
        .select("role")
        .eq("email", headerEmail)
        .maybeSingle();

      if (profile && (profile.role === "admin" || profile.role === "super_admin")) {
        return { isAdmin: true, email: headerEmail };
      }
    } catch {
      // Ignorar error de consulta
    }
  }

  return { isAdmin: false };
}
