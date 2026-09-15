/**
 * SPT (Saladillo Padel Tour) - Canvas Flyer Compositor
 * Renderiza composiciones vectoriales en formato HORIZONTAL (1920x1080 px - 16:9)
 * Diseñado específicamente para publicaciones, pantallas y banners oficiales de pádel.
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
 * Renderiza el flyer horizontal completo (1920x1080 px)
 */
export function renderFlyerOnCanvas(
  canvas: HTMLCanvasElement,
  bgImage: HTMLImageElement | null,
  data: FlyerRenderData
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = 1920;
  const height = 1080;
  canvas.width = width;
  canvas.height = height;

  // 1. DIBUJAR FONDO CON IA (COVER 16:9)
  if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
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
    // Fondo fallback deportivo oscuro
    const bgGrad = ctx.createRadialGradient(960, 540, 150, 960, 540, 1100);
    bgGrad.addColorStop(0, "#0f172a");
    bgGrad.addColorStop(0.6, "#0b0f19");
    bgGrad.addColorStop(1, "#020617");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. GRADIENTES DE CONTRASTE CINEMATOGRÁFICOS HORIZONTALES
  // Degradado horizontal: Más oscuro a la izquierda para garantizar legibilidad del título
  const hGrad = ctx.createLinearGradient(0, 0, width, 0);
  hGrad.addColorStop(0.0, "rgba(5, 8, 18, 0.96)");
  hGrad.addColorStop(0.35, "rgba(5, 8, 18, 0.88)");
  hGrad.addColorStop(0.55, "rgba(5, 8, 18, 0.55)");
  hGrad.addColorStop(0.75, "rgba(5, 8, 18, 0.45)");
  hGrad.addColorStop(1.0, "rgba(5, 8, 18, 0.82)");
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, width, height);

  // Degradado vertical inferior para la barra de sponsors
  const vGrad = ctx.createLinearGradient(0, 0, 0, height);
  vGrad.addColorStop(0.0, "rgba(5, 8, 18, 0.60)");
  vGrad.addColorStop(0.2, "rgba(5, 8, 18, 0.15)");
  vGrad.addColorStop(0.7, "rgba(5, 8, 18, 0.25)");
  vGrad.addColorStop(0.85, "rgba(3, 7, 18, 0.90)");
  vGrad.addColorStop(1.0, "rgba(3, 7, 18, 0.98)");
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, width, height);

  // Viñeta periférica
  const vignette = ctx.createRadialGradient(960, 540, 600, 960, 540, 1200);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.60)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // ==========================================
  // 3. LADO IZQUIERDO: BRANDING, TÍTULO Y CATEGORÍA
  // ==========================================
  ctx.save();
  const leftX = 110;

  // Badge Superior: "CIRCUITO OFICIAL"
  const badgeY = 90;
  ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
  roundRect(ctx, leftX, badgeY, 340, 42, 21);
  ctx.fill();
  ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, leftX, badgeY, 340, 42, 21);
  ctx.stroke();

  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#34d399";
  ctx.shadowColor = "rgba(52, 211, 153, 0.6)";
  ctx.shadowBlur = 8;
  ctx.textAlign = "center";
  ctx.fillText("● CIRCUITO OFICIAL SPT 2026", leftX + 170, badgeY + 27);
  ctx.shadowBlur = 0;

  // Marca Principal: "SALADILLO PADEL TOUR"
  ctx.textAlign = "left";
  const brandY = 200;
  ctx.font = "900 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 12;
  ctx.fillText("SALADILLO", leftX, brandY);

  ctx.font = "900 54px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const brandGrad = ctx.createLinearGradient(leftX, 0, leftX + 420, 0);
  brandGrad.addColorStop(0, "#38bdf8"); // cyan
  brandGrad.addColorStop(0.5, "#00e676"); // verde neón
  brandGrad.addColorStop(1, "#a3e635"); // lima
  ctx.fillStyle = brandGrad;
  ctx.shadowColor = "rgba(0, 230, 118, 0.8)";
  ctx.shadowBlur = 20;
  ctx.fillText("PADEL TOUR", leftX, brandY + 58);
  ctx.shadowBlur = 0;

  // Badge de Categoría
  const categoryText = (data.category || "5TA LIBRES").toUpperCase();
  const catY = 325;
  ctx.font = "800 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const catWidth = ctx.measureText(categoryText).width + 50;

  ctx.fillStyle = "rgba(30, 41, 59, 0.90)";
  roundRect(ctx, leftX, catY, catWidth, 54, 27);
  ctx.fill();
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(56, 189, 248, 0.6)";
  ctx.shadowBlur = 12;
  roundRect(ctx, leftX, catY, catWidth, 54, 27);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#38bdf8";
  ctx.textAlign = "center";
  ctx.fillText(categoryText, leftX + catWidth / 2, catY + 36);

  // Título del Torneo (Multi-línea de alto impacto)
  ctx.textAlign = "left";
  const titleY = 460;
  ctx.font = "900 70px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;
  const lastTitleY = wrapText(
    ctx,
    (data.title || "TORNEO ABIERTO DE PÁDEL").toUpperCase(),
    leftX,
    titleY,
    880,
    82,
    3
  );
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Línea luminosa divisoria con acento neón
  const lineY = Math.max(lastTitleY + 30, 710);
  const lineGrad = ctx.createLinearGradient(leftX, 0, leftX + 780, 0);
  lineGrad.addColorStop(0, "rgba(56, 189, 248, 1)");
  lineGrad.addColorStop(0.5, "rgba(0, 230, 118, 1)");
  lineGrad.addColorStop(1, "rgba(163, 230, 53, 0)");
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(leftX, lineY);
  ctx.lineTo(leftX + 780, lineY);
  ctx.stroke();

  // Sub-etiqueta de Reglas
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(
    "★ SISTEMA AMERICANO  •  PUNTO DE ORO  •  RANKING OFICIAL SPT",
    leftX,
    lineY + 45
  );
  ctx.restore();

  // ==========================================
  // 4. LADO DERECHO: CAJA DE DATOS CON GLASSMORPHISM
  // ==========================================
  const cardX = 1080;
  const cardY = 85;
  const cardW = 730;
  const cardH = 750;

  ctx.save();
  // Fondo glassmorphism oscuro
  ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fill();

  // Borde verde neón (#00e676)
  ctx.strokeStyle = "rgba(0, 230, 118, 0.55)";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "rgba(0, 230, 118, 0.35)";
  ctx.shadowBlur = 18;
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Barra superior interna de la tarjeta
  const cardHeadGrad = ctx.createLinearGradient(cardX, 0, cardX + cardW, 0);
  cardHeadGrad.addColorStop(0, "rgba(0, 230, 118, 0.18)");
  cardHeadGrad.addColorStop(1, "rgba(56, 189, 248, 0.08)");
  ctx.fillStyle = cardHeadGrad;
  roundRect(ctx, cardX, cardY, cardW, 72, 32);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.font = "900 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#00e676";
  ctx.fillText("INFORMACIÓN OFICIAL DEL EVENTO", cardX + cardW / 2, cardY + 45);

  ctx.textAlign = "left";

  // --- ITEM 1: FECHA ---
  const item1Y = cardY + 140;
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("📅 FECHA Y CRONOGRAMA", cardX + 50, item1Y);

  ctx.font = "800 38px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = 8;
  ctx.fillText((data.date || "Próximamente").toUpperCase(), cardX + 50, item1Y + 48);
  ctx.shadowBlur = 0;

  // Separador interno 1
  ctx.strokeStyle = "rgba(51, 65, 85, 0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 50, item1Y + 75);
  ctx.lineTo(cardX + cardW - 50, item1Y + 75);
  ctx.stroke();

  // --- ITEM 2: LUGAR / SEDE ---
  const item2Y = item1Y + 130;
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("📍 SEDE Y CANCHAS", cardX + 50, item2Y);

  ctx.font = "800 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = 8;
  ctx.fillText((data.location || "Saladillo Padel Club").toUpperCase(), cardX + 50, item2Y + 46);
  ctx.shadowBlur = 0;

  // Separador interno 2
  ctx.strokeStyle = "rgba(51, 65, 85, 0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 50, item2Y + 75);
  ctx.lineTo(cardX + cardW - 50, item2Y + 75);
  ctx.stroke();

  // --- ITEM 3: PREMIOS ---
  const item3Y = item2Y + 130;
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText("🏆 PREMIOS Y RECONOCIMIENTOS", cardX + 50, item3Y);

  ctx.font = "900 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const prizeGrad = ctx.createLinearGradient(cardX + 50, 0, cardX + 600, 0);
  prizeGrad.addColorStop(0, "#fbbf24");
  prizeGrad.addColorStop(1, "#a3e635");
  ctx.fillStyle = prizeGrad;
  ctx.shadowColor = "rgba(251, 191, 36, 0.6)";
  ctx.shadowBlur = 16;
  ctx.fillText((data.prizes || "$200.000 EN PREMIOS").toUpperCase(), cardX + 50, item3Y + 54);
  ctx.shadowBlur = 0;

  // Separador interno 3
  ctx.strokeStyle = "rgba(51, 65, 85, 0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 50, item3Y + 85);
  ctx.lineTo(cardX + cardW - 50, item3Y + 85);
  ctx.stroke();

  // Badge inferior dentro de la tarjeta: "INSCRIPCIONES"
  const ctaCardY = item3Y + 115;
  ctx.fillStyle = "rgba(0, 230, 118, 0.12)";
  roundRect(ctx, cardX + 50, ctaCardY, cardW - 100, 52, 26);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 230, 118, 0.5)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, cardX + 50, ctaCardY, cardW - 100, 52, 26);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#34d399";
  ctx.fillText("INSCRIPCIÓN ABIERTA  •  CUPOS LIMITADOS", cardX + cardW / 2, ctaCardY + 33);

  ctx.restore();

  // ==========================================
  // 5. BARRA INFERIOR: SPONSORS Y ENLACE WEB OFICIAL
  // ==========================================
  ctx.save();
  const footBarY = 910;
  const footBarH = 170;

  // Fondo sutil para la barra de sponsors
  ctx.fillStyle = "rgba(3, 7, 18, 0.94)";
  ctx.fillRect(0, footBarY, width, footBarH);

  // Línea divisoria superior de la barra
  ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, footBarY);
  ctx.lineTo(width, footBarY);
  ctx.stroke();

  // Etiqueta Sponsors
  const spLabelY = footBarY + 38;
  ctx.textAlign = "left";
  ctx.font = "800 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("SPONSORS & MARCAS ASOCIADAS:", 110, spLabelY);

  // Pills de Sponsors
  const sponsorsList =
    data.sponsors.length > 0
      ? data.sponsors
      : ["SPT Oficial", "Saladillo Deportes", "Padel Pro", "Bullpadel"];

  const pillY = footBarY + 68;
  const pillHeight = 44;
  const pillPadding = 32;
  const pillGap = 16;
  let curSpX = 110;

  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  sponsorsList.forEach((sponsor) => {
    const textW = ctx.measureText(sponsor).width;
    const pillW = textW + pillPadding * 2;

    // Solo dibujar si entra antes del bloque de la web
    if (curSpX + pillW < 1380) {
      ctx.fillStyle = "rgba(30, 41, 59, 0.85)";
      roundRect(ctx, curSpX, pillY, pillW, pillHeight, 22);
      ctx.fill();

      ctx.strokeStyle = "rgba(71, 85, 105, 0.7)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, curSpX, pillY, pillW, pillHeight, 22);
      ctx.stroke();

      ctx.fillStyle = "#e2e8f0";
      ctx.textAlign = "center";
      ctx.fillText(sponsor, curSpX + pillW / 2, pillY + 30);

      curSpX += pillW + pillGap;
    }
  });

  // Lado Derecho de la barra: Web Oficial y Seguimiento
  ctx.textAlign = "right";
  const webX = width - 110;
  ctx.font = "900 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#00e676";
  ctx.shadowColor = "rgba(0, 230, 118, 0.6)";
  ctx.shadowBlur = 10;
  ctx.fillText("saladillo-padel-tour.vercel.app", webX, footBarY + 60);
  ctx.shadowBlur = 0;

  ctx.font = "bold 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("FIXTURES, RESULTADOS Y RANKINGS EN TIEMPO REAL", webX, footBarY + 95);

  ctx.restore();
}
