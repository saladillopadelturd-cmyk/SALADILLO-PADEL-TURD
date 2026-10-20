import { NextResponse } from "next/server";
import { createAdminClient, verifyIsAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ROOT_ADMIN_EMAILS = [
  "matiasvidal11972@gmail.com",
  "saladillopadelturd@gmail.com",
];

/**
 * GET /api/admin/admins
 * Retorna la lista de todos los administradores del sistema.
 */
export async function GET(request: Request) {
  try {
    const { isAdmin } = await verifyIsAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }

    const adminSb = createAdminClient();
    const { data, error } = await adminSb
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const admins = (data || []).filter(
      (p) =>
        p.role === "admin" ||
        ROOT_ADMIN_EMAILS.includes(p.email.toLowerCase())
    );

    return NextResponse.json({ admins });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al obtener administradores";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/admin/admins
 * Designa a un usuario o jugador como Administrador.
 * Si ya existe en profiles, actualiza su rol a 'admin'.
 * Si no existe en profiles pero está en players o se ingresa su email,
 * se crea su cuenta en Auth, se le asigna rol 'admin' y se vincula su identidad.
 */
export async function POST(request: Request) {
  try {
    const { isAdmin } = await verifyIsAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Acceso denegado: solo un administrador puede gestionar roles." }, { status: 403 });
    }

    const body = await request.json();
    const rawEmail = body?.email;

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { error: "Ingresa un correo electrónico válido." },
        { status: 400 }
      );
    }

    const email = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de correo electrónico inválido." },
        { status: 400 }
      );
    }

    const adminSb = createAdminClient();

    // 1. Verificar si ya existe en profiles
    const { data: existingProfile } = await adminSb
      .from("profiles")
      .select("*")
      .ilike("email", email)
      .maybeSingle();

    if (
      existingProfile &&
      (existingProfile.role === "admin" || ROOT_ADMIN_EMAILS.includes(email))
    ) {
      return NextResponse.json(
        { error: `El usuario ${email} ya cuenta con permisos de Administrador.` },
        { status: 400 }
      );
    }

    if (existingProfile) {
      // Ya tiene cuenta y perfil, solo actualizar rol
      const { data: updated, error: updateErr } = await adminSb
        .from("profiles")
        .update({ role: "admin", updated_at: new Date().toISOString() })
        .eq("id", existingProfile.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      return NextResponse.json({
        success: true,
        profile: updated,
        message: `Se otorgaron permisos de Administrador a ${email}.`,
      });
    }

    // 2. Si no existe en profiles, verificar si existe en la tabla de jugadores (players)
    const { data: existingPlayer } = await adminSb
      .from("players")
      .select("*")
      .ilike("email", email)
      .maybeSingle();

    const playerName = existingPlayer
      ? `${existingPlayer.first_name} ${existingPlayer.last_name}`.trim()
      : email.split("@")[0];

    // 3. Verificar si existe en auth.users
    const { data: userList } = await adminSb.auth.admin.listUsers();
    let authUser = userList?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );

    // Si no existe en auth.users, lo creamos en Auth
    if (!authUser) {
      const { data: createdAuth, error: createAuthErr } =
        await adminSb.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name: playerName,
            name: playerName,
          },
        });

      if (createAuthErr) throw createAuthErr;
      authUser = createdAuth.user;
    }

    if (!authUser) {
      throw new Error("No se pudo inicializar el usuario en el sistema de autenticación.");
    }

    // 4. Asegurar el perfil en 'profiles' con role: 'admin'
    const { data: newProfile, error: profileErr } = await adminSb
      .from("profiles")
      .upsert(
        {
          id: authUser.id,
          email,
          full_name: playerName,
          role: "admin",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (profileErr) throw profileErr;

    // 5. Si existe como jugador en 'players', vincular su user_id
    if (existingPlayer) {
      await adminSb
        .from("players")
        .update({ user_id: authUser.id })
        .eq("id", existingPlayer.id);
    }

    return NextResponse.json({
      success: true,
      profile: newProfile,
      message: `Se designó como Administrador a ${playerName} (${email}).`,
    });
  } catch (err: unknown) {
    console.error("Error en POST /api/admin/admins:", err);
    const msg = err instanceof Error ? err.message : "Error al procesar la solicitud";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/admins
 * Revoca permisos de administrador (pasa a role: 'user').
 */
export async function DELETE(request: Request) {
  try {
    const { isAdmin } = await verifyIsAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Acceso denegado: solo un administrador puede revocar roles." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");
    let email = searchParams.get("email");

    if (!id || !email) {
      try {
        const body = await request.json();
        id = id || body?.id;
        email = email || body?.email;
      } catch {
        // No body
      }
    }

    if (!id || !email) {
      return NextResponse.json(
        { error: "Se requiere ID y email del usuario." },
        { status: 400 }
      );
    }

    if (ROOT_ADMIN_EMAILS.includes(email.toLowerCase())) {
      return NextResponse.json(
        { error: "No es posible revocar permisos al Administrador Raíz." },
        { status: 400 }
      );
    }

    const adminSb = createAdminClient();
    const { error: updateErr } = await adminSb
      .from("profiles")
      .update({ role: "user", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: `Se revocaron los permisos de administrador a ${email}.`,
    });
  } catch (err: unknown) {
    console.error("Error en DELETE /api/admin/admins:", err);
    const msg = err instanceof Error ? err.message : "Error al revocar permisos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
