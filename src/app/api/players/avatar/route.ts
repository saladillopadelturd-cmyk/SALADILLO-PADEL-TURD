import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const bodyParser = { sizeLimit: "10mb" };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hrediohisjcjykaranzx.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY || "";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let buffer: Buffer | null = null;
    let playerId = "";
    const timestamp = Date.now();

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      playerId = (formData.get("player_id") as string) || "";
      const file = formData.get("file") as File | null;

      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }
    } else {
      const body = await req.json();
      playerId = body.player_id || "";
      const { raw_base64 } = body;

      if (raw_base64 && typeof raw_base64 === "string" && raw_base64.startsWith("data:image")) {
        const base64Data = raw_base64.replace(/^data:image\/\w+;base64,/, "");
        buffer = Buffer.from(base64Data, "base64");
      }
    }

    if (!buffer) {
      return NextResponse.json({ success: false, error: "No se proporcionó archivo de imagen" }, { status: 400 });
    }

    // Verificar límite de tamaño (máx 5MB para foto de perfil)
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Imagen demasiado pesada (máx 5MB)" }, { status: 413 });
    }

    const fileName = `player_${playerId || "new"}_${timestamp}.jpg`;
    let finalPhotoUrl = "";

    // 1. Intentar subir a Supabase Storage con Service Role Key en el bucket 'players'
    if (SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/players/${fileName}`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "image/jpeg",
            "x-upsert": "true",
          },
          body: new Uint8Array(buffer),
        });

        if (uploadRes.ok) {
          finalPhotoUrl = `${SUPABASE_URL}/storage/v1/object/public/players/${fileName}`;
        } else {
          // Si el bucket 'players' no existe aún, intentar con el bucket existente 'flyers'
          const fallbackRes = await fetch(`${SUPABASE_URL}/storage/v1/object/flyers/${fileName}`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "image/jpeg",
              "x-upsert": "true",
            },
            body: new Uint8Array(buffer),
          });

          if (fallbackRes.ok) {
            finalPhotoUrl = `${SUPABASE_URL}/storage/v1/object/public/flyers/${fileName}`;
          }
        }
      } catch (uploadErr) {
        console.warn("Storage upload error:", uploadErr);
      }
    }

    // 2. Guardado local en disco como respaldo para desarrollo local
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "players");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const localFilePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(localFilePath, buffer);

      if (!finalPhotoUrl) {
        finalPhotoUrl = `/uploads/players/${fileName}`;
      }
    } catch (fsErr) {
      console.warn("Local storage write warning:", fsErr);
    }

    // 3. Fallback: Si no hay URL remota ni local, data URL optimizada
    if (!finalPhotoUrl) {
      finalPhotoUrl = `data:image/jpeg;base64,${buffer.toString("base64")}`;
    }

    // 4. Si se proporcionó un ID de jugador, actualizar en Supabase
    if (playerId) {
      try {
        const supabase = await createClient();
        await supabase
          .from("players")
          .update({ photo_url: finalPhotoUrl })
          .eq("id", playerId);
      } catch (dbErr) {
        console.warn("Database player photo_url update warning:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      photo_url: finalPhotoUrl,
    });
  } catch (err: unknown) {
    console.error("Error in POST /api/players/avatar:", err);
    const msg = err instanceof Error ? err.message : "Internal Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
