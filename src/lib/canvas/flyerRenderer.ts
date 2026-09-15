/**
 * SPT (Saladillo Padel Tour) - Canvas Flyer Compositor
 * Renderiza composiciones vectoriales de alta definición en formato Historia (1080x1920 px)
 */

export interface FlyerRenderData {
  title: string;
  category: string;
  date: string;
  location: string;
  prizes: string;
  sponsors: string[];
}

/**
 * Dibuja un rectángulo con esquinas redondeadas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Divide y dibuja texto multilínea con ajuste automático
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
      lineCount++;
      if (lineCount >= maxLines - 1 && n < words.length - 1) {
        // Añadir el resto con ellipsis si supera maxLines
        const remaining = words.slice(n).join(" ");
        let truncated = remaining;
        while (ctx.measureText(truncated + "...").width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + "...", x, currentY);
        return currentY + lineHeight;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY + lineHeight;
}

/**
 * Renderiza el flyer completo sobre el elemento Canvas
 */
export function renderFlyerOnCanvas(
  canvas: HTMLCanvasElement,
  bgImage: HTMLImageElement | null,
  data: FlyerRenderData
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = 1080;
  const height = 1920;
  canvas.width = width;
  canvas.height = height;

  // 1. DIBUJAR FONDO
  if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
    // Escalar cover
    const imgRatio = bgImage.naturalWidth / bgImage.naturalHeight;
    const canvasRatio = width / height;
    let renderW = width;
    let renderH = height;
    let offsetX = 0;
    let offsetY = 0;

    if (imgRatio > canvasRatio) {
      renderW = height * imgRatio;
      offsetX = (width - renderW) / 2;
    } else {
      renderH = width / imgRatio;
      offsetY = (height - renderH) / 2;
    }

    ctx.drawImage(bgImage, offsetX, offsetY, renderW, renderH);
  } else {
    // Fondo fallback si aún no carga imagen
    const bgGrad = ctx.createRadialGradient(540, 800, 100, 540, 960, 1100);
    bgGrad.addColorStop(0, "#0f172a");
    bgGrad.addColorStop(0.5, "#0b0f19");
    bgGrad.addColorStop(1, "#020617");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. GRADIENTES DE CONTRASTE CINEMATOGRÁFICOS
  // Degradado vertical principal (oscurece arriba y abajo para asegurar legibilidad)
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0.0, "rgba(5, 8, 15, 0.92)");
  grad.addColorStop(0.15, "rgba(5, 8, 15, 0.50)");
  grad.addColorStop(0.35, "rgba(5, 8, 15, 0.25)");
  grad.addColorStop(0.55, "rgba(5, 8, 15, 0.40)");
  grad.addColorStop(0.72, "rgba(5, 8, 15, 0.85)");
  grad.addColorStop(0.92, "rgba(5, 8, 15, 0.98)");
  grad.addColorStop(1.0, "rgba(5, 8, 15, 1.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Viñeta lateral sutil
  const vignette = ctx.createRadialGradient(540, 960, 500, 540, 960, 1000);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.65)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // 3. ENCABEZADO DE MARCA (BRANDING SPT)
  ctx.save();
  ctx.textAlign = "center";

  // Badge superior "CIRCUITO OFICIAL"
  const topBadgeY = 120;
  ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
  roundRect(ctx, 540 - 200, topBadgeY, 400, 48, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
  ctx.lineWidth = 2;
  roundRect(ctx, 540 - 200, topBadgeY, 400, 48, 24);
  ctx.stroke();

  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#34d399";
  ctx.shadowColor = "rgba(52, 211, 153, 0.6)";
  ctx.shadowBlur = 10;
  ctx.fillText("● CIRCUITO OFICIAL SPT 2026", 540, topBadgeY + 31);
  ctx.shadowBlur = 0;

  // Marca Principal: "SALADILLO PADEL TOUR"
  const brandY = 230;
  ctx.font = "900 60px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 15;
  ctx.fillText("SALADILLO", 540, brandY);

  ctx.font = "900 64px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const brandGrad = ctx.createLinearGradient(300, 0, 780, 0);
  brandGrad.addColorStop(0, "#38bdf8"); // cyan
  brandGrad.addColorStop(0.5, "#34d399"); // emerald
  brandGrad.addColorStop(1, "#a3e635"); // lime
  ctx.fillStyle = brandGrad;
  ctx.shadowColor = "rgba(52, 211, 153, 0.8)";
  ctx.shadowBlur = 25;
  ctx.fillText("PADEL TOUR", 540, brandY + 68);
  ctx.shadowBlur = 0;
  ctx.restore();

  // 4. CUERPO CENTRAL (CATEGORÍA & TÍTULO DEL TORNEO)
  ctx.save();
  ctx.textAlign = "center";

  // Badge de Categoría
  const categoryText = (data.category || "CATEGORÍA LIBRE").toUpperCase();
  const catY = 460;
  ctx.font = "800 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const catWidth = Math.min(ctx.measureText(categoryText).width + 60, 800);

  ctx.fillStyle = "rgba(30, 41, 59, 0.85)";
  roundRect(ctx, 540 - catWidth / 2, catY, catWidth, 64, 32);
  ctx.fill();
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "rgba(56, 189, 248, 0.6)";
  ctx.shadowBlur = 15;
  roundRect(ctx, 540 - catWidth / 2, catY, catWidth, 64, 32);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#38bdf8";
  ctx.fillText(categoryText, 540, catY + 44);

  // Título del Torneo
  const titleY = 600;
  ctx.font = "900 76px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;
  wrapText(ctx, (data.title || "GRAN TORNEO DE PÁDEL").toUpperCase(), 540, titleY, 940, 88, 3);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Línea divisoria luminosa
  const lineY = 820;
  const lineGrad = ctx.createLinearGradient(200, 0, 880, 0);
  lineGrad.addColorStop(0, "rgba(56, 189, 248, 0)");
  lineGrad.addColorStop(0.2, "rgba(56, 189, 248, 0.8)");
  lineGrad.addColorStop(0.5, "rgba(52, 211, 153, 1)");
  lineGrad.addColorStop(0.8, "rgba(163, 230, 53, 0.8)");
  lineGrad.addColorStop(1, "rgba(163, 230, 53, 0)");
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(200, lineY);
  ctx.lineTo(880, lineY);
  ctx.stroke();
  ctx.restore();

  // 5. CAJA DE INFORMACIÓN (TARJETA SEMI-TRANSPARENTE)
  const cardX = 90;
  const cardY = 880;
  const cardW = 900;
  const cardH = 580;

  ctx.save();
  // Fondo de tarjeta con glassmorphism
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.fill();

  ctx.strokeStyle = "rgba(51, 65, 85, 0.7)";
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.stroke();

  // Borde resplandor superior
  ctx.strokeStyle = "rgba(52, 211, 153, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 36, cardY);
  ctx.lineTo(cardX + cardW - 36, cardY);
  ctx.stroke();

  // --- Item 1: FECHA ---
  const item1Y = cardY + 70;
  ctx.textAlign = "left";
  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("📅 FECHA DEL EVENTO", cardX + 60, item1Y);

  ctx.font = "800 40px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 8;
  ctx.fillText(data.date || "Próximamente", cardX + 60, item1Y + 50);
  ctx.shadowBlur = 0;

  // Separador interno 1
  ctx.strokeStyle = "rgba(51, 65, 85, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 60, item1Y + 80);
  ctx.lineTo(cardX + cardW - 60, item1Y + 80);
  ctx.stroke();

  // --- Item 2: LUGAR / SEDE ---
  const item2Y = item1Y + 130;
  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("📍 SEDE / CLUB", cardX + 60, item2Y);

  ctx.font = "800 38px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 8;
  ctx.fillText(data.location || "Saladillo Padel Club", cardX + 60, item2Y + 48);
  ctx.shadowBlur = 0;

  // Separador interno 2
  ctx.strokeStyle = "rgba(51, 65, 85, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 60, item2Y + 80);
  ctx.lineTo(cardX + cardW - 60, item2Y + 80);
  ctx.stroke();

  // --- Item 3: PREMIOS ---
  const item3Y = item2Y + 130;
  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText("🏆 PREMIOS Y TROFEOS", cardX + 60, item3Y);

  ctx.font = "900 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const prizeGrad = ctx.createLinearGradient(cardX + 60, 0, cardX + 600, 0);
  prizeGrad.addColorStop(0, "#fbbf24"); // amber
  prizeGrad.addColorStop(1, "#a3e635"); // lime
  ctx.fillStyle = prizeGrad;
  ctx.shadowColor = "rgba(251, 191, 36, 0.5)";
  ctx.shadowBlur = 15;
  ctx.fillText(data.prizes || "$200.000 EN PREMIOS", cardX + 60, item3Y + 54);
  ctx.shadowBlur = 0;

  // Badge inferior dentro de la tarjeta: Reglas
  const subRuleY = cardY + cardH - 45;
  ctx.textAlign = "center";
  ctx.font = "700 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("SISTEMA AMERICANO  •  PUNTO DE ORO  •  RANKING OFICIAL", 540, subRuleY);
  ctx.restore();

  // 6. PIE (SPONSORS Y REDES SOCIALES)
  ctx.save();
  ctx.textAlign = "center";

  // Título Sponsors
  const sponsorsLabelY = 1520;
  ctx.font = "800 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("APOYAN ESTE TORNEO", 540, sponsorsLabelY);

  // Lista de Sponsors (Pills modernas)
  const sponsorsList = data.sponsors.length > 0 ? data.sponsors : ["SPT Oficial", "Saladillo Deportes", "Padel Pro"];
  const spY = 1580;

  // Calculamos ancho total para centrar
  let currentSpX = 540;
  const pillHeight = 46;

  // Dibuja sponsors centrados
  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const pillPaddings = 36;
  const pillGap = 16;

  const measuredPills = sponsorsList.map((sp) => ({
    name: sp,
    width: ctx.measureText(sp).width + pillPaddings * 2,
  }));

  const totalPillsWidth = measuredPills.reduce((acc, p) => acc + p.width, 0) + (measuredPills.length - 1) * pillGap;

  let startX = 540 - totalPillsWidth / 2;
  // Si supera el ancho, repartir en 2 filas si es necesario
  if (totalPillsWidth > 960) {
    startX = 100;
  }

  measuredPills.forEach((pill) => {
    ctx.fillStyle = "rgba(30, 41, 59, 0.75)";
    roundRect(ctx, startX, spY, pill.width, pillHeight, 23);
    ctx.fill();

    ctx.strokeStyle = "rgba(71, 85, 105, 0.6)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, startX, spY, pill.width, pillHeight, 23);
    ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "center";
    ctx.fillText(pill.name, startX + pill.width / 2, spY + 31);

    startX += pill.width + pillGap;
  });

  // Footer: Web y Redes
  const footerY = 1780;
  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#34d399";
  ctx.shadowColor = "rgba(52, 211, 153, 0.6)";
  ctx.shadowBlur = 10;
  ctx.fillText("saladillo-padel-tour.vercel.app", 540, footerY);
  ctx.shadowBlur = 0;

  ctx.font = "500 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("SEGUIMIENTO EN TIEMPO REAL  •  FIXTURES Y TABLAS EN VIVO", 540, footerY + 36);

  ctx.restore();
}
