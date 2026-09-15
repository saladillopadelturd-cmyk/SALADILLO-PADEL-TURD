/**
 * SPT (Saladillo Padel Tour) - Canvas Flyer Compositor
 * Renderiza composiciones vectoriales en formato HORIZONTAL (1920x1080 px - 16:9)
 * Soporta múltiples variaciones de estilo y paletas dinámicas para regeneración visual única.
 */

export type FlyerTheme =
  | "neon_emerald"
  | "gold_luxury"
  | "cyan_glacier"
  | "fire_sunset"
  | "cyber_violet";

export interface FlyerRenderData {
  title: string;
  category: string;
  date: string;
  location: string;
  prizes: string;
  sponsors: string[];
  theme?: FlyerTheme;
}

interface ThemeConfig {
  name: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  brandPrimaryText: string;
  brandGradient: [string, string, string];
  brandGlow: string;
  catBadgeBg: string;
  catBadgeBorder: string;
  catBadgeText: string;
  lineGradient: [string, string, string];
  cardBg: string;
  cardBorder: string;
  cardBorderGlow: string;
  cardHeadGradient: [string, string];
  cardHeadText: string;
  prizeGradient: [string, string];
  ctaBg: string;
  ctaBorder: string;
  ctaText: string;
  ctaLabel: string;
  footerWebColor: string;
  footerGlow: string;
}

export const THEMES: Record<FlyerTheme, ThemeConfig> = {
  neon_emerald: {
    name: "Neón Esmeralda (SPT Oficial)",
    badgeBg: "rgba(16, 185, 129, 0.15)",
    badgeBorder: "rgba(16, 185, 129, 0.6)",
    badgeText: "#34d399",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#38bdf8", "#00e676", "#a3e635"],
    brandGlow: "rgba(0, 230, 118, 0.8)",
    catBadgeBg: "rgba(30, 41, 59, 0.90)",
    catBadgeBorder: "#38bdf8",
    catBadgeText: "#38bdf8",
    lineGradient: ["rgba(56, 189, 248, 1)", "rgba(0, 230, 118, 1)", "rgba(163, 230, 53, 0)"],
    cardBg: "rgba(15, 23, 42, 0.86)",
    cardBorder: "rgba(0, 230, 118, 0.55)",
    cardBorderGlow: "rgba(0, 230, 118, 0.35)",
    cardHeadGradient: ["rgba(0, 230, 118, 0.18)", "rgba(56, 189, 248, 0.08)"],
    cardHeadText: "#00e676",
    prizeGradient: ["#fbbf24", "#a3e635"],
    ctaBg: "rgba(0, 230, 118, 0.12)",
    ctaBorder: "rgba(0, 230, 118, 0.5)",
    ctaText: "#34d399",
    ctaLabel: "INSCRIPCIÓN ABIERTA  •  CUPOS LIMITADOS",
    footerWebColor: "#00e676",
    footerGlow: "rgba(0, 230, 118, 0.6)",
  },
  gold_luxury: {
    name: "Oro Master Final",
    badgeBg: "rgba(251, 191, 36, 0.15)",
    badgeBorder: "rgba(251, 191, 36, 0.6)",
    badgeText: "#fbbf24",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#fef08a", "#f59e0b", "#d97706"],
    brandGlow: "rgba(245, 158, 11, 0.8)",
    catBadgeBg: "rgba(28, 25, 18, 0.92)",
    catBadgeBorder: "#fbbf24",
    catBadgeText: "#fef08a",
    lineGradient: ["rgba(251, 191, 36, 1)", "rgba(245, 158, 11, 1)", "rgba(217, 119, 6, 0)"],
    cardBg: "rgba(20, 17, 12, 0.88)",
    cardBorder: "rgba(251, 191, 36, 0.65)",
    cardBorderGlow: "rgba(251, 191, 36, 0.40)",
    cardHeadGradient: ["rgba(251, 191, 36, 0.22)", "rgba(245, 158, 11, 0.10)"],
    cardHeadText: "#fbbf24",
    prizeGradient: ["#fef08a", "#f59e0b"],
    ctaBg: "rgba(251, 191, 36, 0.15)",
    ctaBorder: "rgba(251, 191, 36, 0.6)",
    ctaText: "#fef08a",
    ctaLabel: "GRAN FINAL DEL CIRCUITO  •  PUNTOS DOBLES",
    footerWebColor: "#fbbf24",
    footerGlow: "rgba(251, 191, 36, 0.6)",
  },
  cyan_glacier: {
    name: "Azul Glaciar Pro",
    badgeBg: "rgba(6, 182, 212, 0.15)",
    badgeBorder: "rgba(6, 182, 212, 0.6)",
    badgeText: "#22d3ee",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#67e8f9", "#38bdf8", "#3b82f6"],
    brandGlow: "rgba(56, 189, 248, 0.85)",
    catBadgeBg: "rgba(15, 23, 42, 0.90)",
    catBadgeBorder: "#38bdf8",
    catBadgeText: "#38bdf8",
    lineGradient: ["rgba(34, 211, 238, 1)", "rgba(59, 130, 246, 1)", "rgba(99, 102, 241, 0)"],
    cardBg: "rgba(10, 18, 32, 0.88)",
    cardBorder: "rgba(56, 189, 248, 0.60)",
    cardBorderGlow: "rgba(56, 189, 248, 0.35)",
    cardHeadGradient: ["rgba(56, 189, 248, 0.22)", "rgba(59, 130, 246, 0.10)"],
    cardHeadText: "#38bdf8",
    prizeGradient: ["#38bdf8", "#a3e635"],
    ctaBg: "rgba(56, 189, 248, 0.12)",
    ctaBorder: "rgba(56, 189, 248, 0.5)",
    ctaText: "#38bdf8",
    ctaLabel: "TORNEO OFICIAL  •  SEGUIMIENTO EN VIVO",
    footerWebColor: "#38bdf8",
    footerGlow: "rgba(56, 189, 248, 0.6)",
  },
  fire_sunset: {
    name: "Fuego & Pasión",
    badgeBg: "rgba(239, 68, 68, 0.15)",
    badgeBorder: "rgba(239, 68, 68, 0.6)",
    badgeText: "#f87171",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#fde047", "#f97316", "#ef4444"],
    brandGlow: "rgba(249, 115, 22, 0.85)",
    catBadgeBg: "rgba(30, 15, 15, 0.92)",
    catBadgeBorder: "#f97316",
    catBadgeText: "#fdba74",
    lineGradient: ["rgba(249, 115, 22, 1)", "rgba(239, 68, 68, 1)", "rgba(220, 38, 38, 0)"],
    cardBg: "rgba(24, 14, 14, 0.90)",
    cardBorder: "rgba(249, 115, 22, 0.65)",
    cardBorderGlow: "rgba(249, 115, 22, 0.35)",
    cardHeadGradient: ["rgba(249, 115, 22, 0.25)", "rgba(239, 68, 68, 0.10)"],
    cardHeadText: "#fb923c",
    prizeGradient: ["#fef08a", "#f97316"],
    ctaBg: "rgba(239, 68, 68, 0.15)",
    ctaBorder: "rgba(249, 115, 22, 0.5)",
    ctaText: "#fdba74",
    ctaLabel: "BATALLA DE TITANES  •  PUNTO DE ORO",
    footerWebColor: "#fb923c",
    footerGlow: "rgba(249, 115, 22, 0.6)",
  },
  cyber_violet: {
    name: "Cyber Violet Night",
    badgeBg: "rgba(168, 85, 247, 0.15)",
    badgeBorder: "rgba(168, 85, 247, 0.6)",
    badgeText: "#c084fc",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#c084fc", "#a855f7", "#ec4899"],
    brandGlow: "rgba(168, 85, 247, 0.85)",
    catBadgeBg: "rgba(24, 16, 36, 0.92)",
    catBadgeBorder: "#c084fc",
    catBadgeText: "#e9d5ff",
    lineGradient: ["rgba(192, 132, 252, 1)", "rgba(236, 72, 153, 1)", "rgba(168, 85, 247, 0)"],
    cardBg: "rgba(19, 13, 30, 0.90)",
    cardBorder: "rgba(168, 85, 247, 0.65)",
    cardBorderGlow: "rgba(168, 85, 247, 0.35)",
    cardHeadGradient: ["rgba(168, 85, 247, 0.25)", "rgba(236, 72, 153, 0.10)"],
    cardHeadText: "#c084fc",
    prizeGradient: ["#f472b6", "#fde047"],
    ctaBg: "rgba(168, 85, 247, 0.15)",
    ctaBorder: "rgba(168, 85, 247, 0.5)",
    ctaText: "#e9d5ff",
    ctaLabel: "EDICIÓN ESPECIAL NOCTURNA  •  SPT 2026",
    footerWebColor: "#c084fc",
    footerGlow: "rgba(168, 85, 247, 0.6)",
  },
};

export const ALL_THEMES: FlyerTheme[] = [
  "neon_emerald",
  "gold_luxury",
  "cyan_glacier",
  "fire_sunset",
  "cyber_violet",
];

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
 * Renderiza el flyer horizontal completo (1920x1080 px) aplicando el tema visual
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

  const activeThemeKey: FlyerTheme = data.theme || "neon_emerald";
  const theme = THEMES[activeThemeKey] || THEMES.neon_emerald;

  // 1. DIBUJAR FONDO LOCAL (COVER 16:9)
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
  const hGrad = ctx.createLinearGradient(0, 0, width, 0);
  hGrad.addColorStop(0.0, "rgba(5, 8, 18, 0.96)");
  hGrad.addColorStop(0.35, "rgba(5, 8, 18, 0.88)");
  hGrad.addColorStop(0.55, "rgba(5, 8, 18, 0.55)");
  hGrad.addColorStop(0.75, "rgba(5, 8, 18, 0.45)");
  hGrad.addColorStop(1.0, "rgba(5, 8, 18, 0.82)");
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, width, height);

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

  // Badge Superior
  const badgeY = 90;
  ctx.fillStyle = theme.badgeBg;
  roundRect(ctx, leftX, badgeY, 340, 42, 21);
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 1.5;
  roundRect(ctx, leftX, badgeY, 340, 42, 21);
  ctx.stroke();

  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.shadowColor = theme.badgeText;
  ctx.shadowBlur = 8;
  ctx.textAlign = "center";
  ctx.fillText("● CIRCUITO OFICIAL SPT 2026", leftX + 170, badgeY + 27);
  ctx.shadowBlur = 0;

  // Marca Principal: "SALADILLO PADEL TOUR"
  ctx.textAlign = "left";
  const brandY = 200;
  ctx.font = "900 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = theme.brandPrimaryText;
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 12;
  ctx.fillText("SALADILLO", leftX, brandY);

  ctx.font = "900 54px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const brandGrad = ctx.createLinearGradient(leftX, 0, leftX + 440, 0);
  brandGrad.addColorStop(0, theme.brandGradient[0]);
  brandGrad.addColorStop(0.5, theme.brandGradient[1]);
  brandGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = brandGrad;
  ctx.shadowColor = theme.brandGlow;
  ctx.shadowBlur = 20;
  ctx.fillText("PADEL TOUR", leftX, brandY + 58);
  ctx.shadowBlur = 0;

  // Badge de Categoría
  const categoryText = (data.category || "5TA LIBRES").toUpperCase();
  const catY = 325;
  ctx.font = "800 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const catWidth = ctx.measureText(categoryText).width + 50;

  ctx.fillStyle = theme.catBadgeBg;
  roundRect(ctx, leftX, catY, catWidth, 54, 27);
  ctx.fill();
  ctx.strokeStyle = theme.catBadgeBorder;
  ctx.lineWidth = 2;
  ctx.shadowColor = theme.catBadgeBorder;
  ctx.shadowBlur = 12;
  roundRect(ctx, leftX, catY, catWidth, 54, 27);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = theme.catBadgeText;
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

  // Línea luminosa divisoria con acento de tema
  const lineY = Math.max(lastTitleY + 30, 710);
  const lineGrad = ctx.createLinearGradient(leftX, 0, leftX + 780, 0);
  lineGrad.addColorStop(0, theme.lineGradient[0]);
  lineGrad.addColorStop(0.5, theme.lineGradient[1]);
  lineGrad.addColorStop(1, theme.lineGradient[2]);
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
  // Fondo de tarjeta
  ctx.fillStyle = theme.cardBg;
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fill();

  // Borde temático
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = theme.cardBorderGlow;
  ctx.shadowBlur = 18;
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Barra superior interna de la tarjeta
  const cardHeadGrad = ctx.createLinearGradient(cardX, 0, cardX + cardW, 0);
  cardHeadGrad.addColorStop(0, theme.cardHeadGradient[0]);
  cardHeadGrad.addColorStop(1, theme.cardHeadGradient[1]);
  ctx.fillStyle = cardHeadGrad;
  roundRect(ctx, cardX, cardY, cardW, 72, 32);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.font = "900 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = theme.cardHeadText;
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
  prizeGrad.addColorStop(0, theme.prizeGradient[0]);
  prizeGrad.addColorStop(1, theme.prizeGradient[1]);
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

  // Badge inferior dentro de la tarjeta
  const ctaCardY = item3Y + 115;
  ctx.fillStyle = theme.ctaBg;
  roundRect(ctx, cardX + 50, ctaCardY, cardW - 100, 52, 26);
  ctx.fill();
  ctx.strokeStyle = theme.ctaBorder;
  ctx.lineWidth = 1.5;
  roundRect(ctx, cardX + 50, ctaCardY, cardW - 100, 52, 26);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = theme.ctaText;
  ctx.fillText(theme.ctaLabel, cardX + cardW / 2, ctaCardY + 33);

  ctx.restore();

  // ==========================================
  // 5. BARRA INFERIOR: SPONSORS Y ENLACE WEB OFICIAL
  // ==========================================
  ctx.save();
  const footBarY = 910;
  const footBarH = 170;

  ctx.fillStyle = "rgba(3, 7, 18, 0.94)";
  ctx.fillRect(0, footBarY, width, footBarH);

  ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, footBarY);
  ctx.lineTo(width, footBarY);
  ctx.stroke();

  const spLabelY = footBarY + 38;
  ctx.textAlign = "left";
  ctx.font = "800 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("SPONSORS & MARCAS ASOCIADAS:", 110, spLabelY);

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

  ctx.textAlign = "right";
  const webX = width - 110;
  ctx.font = "900 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = theme.footerWebColor;
  ctx.shadowColor = theme.footerGlow;
  ctx.shadowBlur = 10;
  ctx.fillText("saladillo-padel-tour.vercel.app", webX, footBarY + 60);
  ctx.shadowBlur = 0;

  ctx.font = "bold 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("FIXTURES, RESULTADOS Y RANKINGS EN TIEMPO REAL", webX, footBarY + 95);

  ctx.restore();
}
