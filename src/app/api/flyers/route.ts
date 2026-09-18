import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const bodyParser = { sizeLimit: "10mb" };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hrediohisjcjykaranzx.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY || "";

const DEFAULT_FLYER = {
  id: "oficial-spt-2026",
  title: "GRAN TORNEO APERTURA 2026 - SALADILLO PADEL TOUR",
  image_url: "/assets/fondos/flyer_oficial_spt.png",
  link_url: "#torneos-activos",
  active: true,
  sort_order: -1,
  created_at: "2026-09-17T00:00:00.000Z",
};

export async function GET() {
  // 1. Consultar Supabase Storage público (disponible en todos los dispositivos y Vercel)
  try {
    const storageRes = await fetch(`${SUPABASE_URL}/storage/v1/object/public/flyers/confirmed_flyer.json`, {
      cache: "no-store",
    });
    if (storageRes.ok) {
      const data = await storageRes.json();
      if (data && data.image_url) {
        return NextResponse.json({ flyers: [data] });
      }
    }
  } catch (storageErr) {
    console.warn("Storage confirmed flyer fetch error:", storageErr);
  }

  // 2. Intentar consultar tabla 'flyers' en Supabase si existe
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("flyers")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return NextResponse.json({ flyers: data });
    }
  } catch (err) {
    console.warn("Supabase flyers fetch warning:", err);
  }

  // 3. Fallback local desde public/confirmed_flyer.json (entorno de desarrollo local)
  try {
    const filePath = path.join(process.cwd(), "public", "confirmed_flyer.json");
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(fileData);
      if (parsed && parsed.image_url) {
        return NextResponse.json({ flyers: [parsed] });
      }
    }
  } catch (err) {
    console.warn("Local file fallback error:", err);
  }

  // 4. Flyer por defecto oficial para que nunca quede vacío en el móvil
  return NextResponse.json({ flyers: [DEFAULT_FLYER] });
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let title = "Torneo Saladillo Padel Tour";
    let link_url = "#torneos-activos";
    let buffer: Buffer | null = null;
    let fileName = `flyer_confirmado_${Date.now()}.png`;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      title = formData.get("title") as string || title;
      link_url = formData.get("link_url") as string || link_url;
      const file = formData.get("file") as File | null;
      
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }
    } else {
      const body = await req.json();
      title = body.title || title;
      link_url = body.link_url || link_url;
      const { raw_base64 } = body;
      
      if (raw_base64 && typeof raw_base64 === "string" && raw_base64.startsWith("data:image")) {
        const base64Data = raw_base64.replace(/^data:image\/\w+;base64,/, "");
        buffer = Buffer.from(base64Data, "base64");
      }
    }

    let finalImageUrl = "";

    // Si tenemos buffer, subir a Supabase Storage
    if (buffer) {
      // Verificar tamaño (max 5MB)
      if (buffer.length > 5 * 1024 * 1024) {
        return NextResponse.json({ success: false, error: "Imagen demasiado grande (máx 5MB)" }, { status: 413 });
      }

        // Subir a Supabase Storage con Service Role Key
        if (SUPABASE_SERVICE_ROLE_KEY) {
          const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/flyers/${fileName}`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "image/png",
              "x-upsert": "true",
            },
            body: new Uint8Array(buffer),
          });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          console.error("Storage upload failed:", uploadRes.status, errText);
          return NextResponse.json({ success: false, error: "Error subiendo a Storage" }, { status: 500 });
        }

        finalImageUrl = `${SUPABASE_URL}/storage/v1/object/public/flyers/${fileName}`;
      }

      // Guardado local opcional en disco (solo funciona en dev local)
      try {
        const localSavePath = path.join(process.cwd(), "public", "assets", "fondos", fileName);
        fs.writeFileSync(localSavePath, buffer);
        if (!finalImageUrl) {
          finalImageUrl = `/assets/fondos/${fileName}`;
        }
      } catch {}
    } else {
      finalImageUrl = "/assets/fondos/flyer_oficial_spt.png";
    }

    const confirmedFlyer = {
      id: `confirmed-${Date.now()}`,
      title: title || "Torneo Saladillo Padel Tour",
      image_url: finalImageUrl,
      link_url: link_url || "#torneos-activos",
      active: true,
      sort_order: -1,
      created_at: new Date().toISOString(),
    };

    // 2. Guardar confirmed_flyer.json en Supabase Storage (disponible para todos los móviles)
    if (SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/storage/v1/object/flyers/confirmed_flyer.json`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            "x-upsert": "true",
          },
          body: JSON.stringify(confirmedFlyer, null, 2),
        });
      } catch (storageErr) {
        console.warn("Storage upload confirmed_flyer.json warning:", storageErr);
      }
    }

    // 3. Guardar en public/confirmed_flyer.json para entorno local
    try {
      const filePath = path.join(process.cwd(), "public", "confirmed_flyer.json");
      fs.writeFileSync(filePath, JSON.stringify(confirmedFlyer, null, 2), "utf-8");
    } catch {}

    // 4. Intentar guardar en Supabase Database si la tabla 'flyers' existe
    try {
      const supabase = await createClient();
      await supabase.from("flyers").insert({
        title: confirmedFlyer.title,
        image_url: confirmedFlyer.image_url,
        link_url: confirmedFlyer.link_url,
        active: true,
        sort_order: -1,
      });
    } catch {}

    return NextResponse.json({ success: true, flyer: confirmedFlyer });
  } catch (error) {
    console.error("Error in POST /api/flyers:", error);
    return NextResponse.json({ success: false, error: "Internal Error" }, { status: 500 });
  }
}
