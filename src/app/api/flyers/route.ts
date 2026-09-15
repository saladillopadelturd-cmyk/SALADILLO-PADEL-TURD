import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  let flyers = [];

  // 1. Intentar consultar Supabase
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("flyers")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      flyers = data;
      return NextResponse.json({ flyers });
    }
  } catch (err) {
    console.warn("Supabase flyers fetch warning:", err);
  }

  // 2. Fallback local desde public/confirmed_flyer.json
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
    console.error("Local file fallback error:", err);
  }

  return NextResponse.json({ flyers: [] });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, image_url, link_url, raw_base64 } = body;

    let finalImageUrl = image_url;

    // Si viene base64 crudo, guardarlo como asset estático en el servidor
    if (raw_base64 && typeof raw_base64 === "string" && raw_base64.startsWith("data:image")) {
      try {
        const base64Data = raw_base64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `flyer_confirmado_${Date.now()}.png`;
        const localSavePath = path.join(process.cwd(), "public", "assets", "fondos", fileName);
        
        fs.writeFileSync(localSavePath, buffer);
        finalImageUrl = `/assets/fondos/${fileName}`;
      } catch (saveErr) {
        console.warn("Could not save image buffer to disk:", saveErr);
      }
    }

    const confirmedFlyer = {
      id: `confirmed-${Date.now()}`,
      title: title || "Torneo SPT",
      image_url: finalImageUrl,
      link_url: link_url || "#torneos-activos",
      active: true,
      sort_order: -1,
      created_at: new Date().toISOString(),
    };

    // 1. Guardar en public/confirmed_flyer.json para persistencia garantizada
    try {
      const filePath = path.join(process.cwd(), "public", "confirmed_flyer.json");
      fs.writeFileSync(filePath, JSON.stringify(confirmedFlyer, null, 2), "utf-8");
    } catch (fsErr) {
      console.warn("Could not write confirmed_flyer.json:", fsErr);
    }

    // 2. Intentar guardar en Supabase si está disponible
    try {
      const supabase = await createClient();
      await supabase.from("flyers").insert({
        title: confirmedFlyer.title,
        image_url: confirmedFlyer.image_url,
        link_url: confirmedFlyer.link_url,
        active: true,
        sort_order: -1,
      });
    } catch (dbErr) {
      console.warn("Supabase insert fallback:", dbErr);
    }

    return NextResponse.json({ success: true, flyer: confirmedFlyer });
  } catch (error) {
    console.error("Error in POST /api/flyers:", error);
    return NextResponse.json({ success: false, error: "Internal Error" }, { status: 500 });
  }
}
