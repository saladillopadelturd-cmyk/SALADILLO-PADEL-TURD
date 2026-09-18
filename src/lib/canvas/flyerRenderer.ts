/**
 * SPT (Saladillo Padel Tour) - Canvas Flyer Compositor
 * Renderiza composiciones vectoriales en formato HORIZONTAL (1920x1080 px - 16:9)
 *
 * ESPECIFICACIONES DE DISEÑO:
 * - Logo LOGOSPT.png con ancho >= 20% del ancho total del canvas (min 384px - 440px),
 *   respetando al 100% su relación de aspecto original (nunca deformado).
 * - Fondos luminosos y nítidos: se reduce drásticamente el oscurecimiento para lucir
 *   las fotos de las pistas e instalaciones.
 * - Sin redundancias: se eliminan los textos repetitivos "SALADILLO PADEL TOUR - CIRCUITO OFICIAL",
 *   ya que el logotipo oficial ya incluye claramente toda la marca.
 * - Ajuste milimétrico de tipografías y textos para que jamás desborden sus marcos.
 */

export type FlyerTheme =
  | "neon_emerald"
  | "gold_luxury"
  | "cyan_glacier"
  | "fire_sunset"
  | "cyber_violet";

export type FlyerLayout =
  | "split_card"
  | "hero_center"
  | "split_inverted"
  | "magazine_bold";

export interface FlyerRenderData {
  title: string;
  category: string;
  date: string;
  location: string;
  prizes: string;
  sponsors: string[];
  theme?: FlyerTheme;
  layout?: FlyerLayout;
}

interface ThemeConfig {
  name: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  brandPrimaryText: string;
  brandGradient: [string, string, string];
  accentColor: string;
  cardBorder: string;
  cardGlow: string;
  footerBg: string;
}

export const ALL_THEMES: FlyerTheme[] = [
  "neon_emerald",
  "gold_luxury",
  "cyan_glacier",
  "fire_sunset",
  "cyber_violet",
];

export const ALL_LAYOUTS: FlyerLayout[] = [
  "split_card",
  "hero_center",
  "split_inverted",
  "magazine_bold",
];

export const LAYOUT_CONFIGS: Record<
  FlyerLayout,
  { name: string; description: string; logoPosition: string }
> = {
  split_card: {
    name: "Clásico Asimétrico",
    description: "Logo destacado superior izquierda, títulos a la izquierda y tarjeta vertical lateral",
    logoPosition: "Superior Izquierda",
  },
  hero_center: {
    name: "Impacto Central",
    description: "Logo central panorámico con halo dorado, títulos centrados y 3 módulos podio",
    logoPosition: "Centro Superior",
  },
  split_inverted: {
    name: "Invertido Vanguardia",
    description: "Logo superior derecha, tarjeta vertical a la izquierda y títulos a la derecha",
    logoPosition: "Superior Derecha",
  },
  magazine_bold: {
    name: "Editorial Deportivo",
    description: "Logo en cabecera panorámica, titular masivo y módulos gemelos equilibrados",
    logoPosition: "Cabecera Panorámica Derecha",
  },
};

export const THEMES: Record<FlyerTheme, ThemeConfig> = {
  neon_emerald: {
    name: "Verde Neón Oficial",
    badgeBg: "rgba(34, 197, 94, 0.22)",
    badgeBorder: "rgba(34, 197, 94, 0.7)",
    badgeText: "#4ade80",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#4ade80", "#22c55e"],
    accentColor: "#22c55e",
    cardBorder: "rgba(34, 197, 94, 0.5)",
    cardGlow: "rgba(34, 197, 94, 0.25)",
    footerBg: "rgba(6, 16, 12, 0.94)",
  },
  gold_luxury: {
    name: "Oro & Platino Master",
    badgeBg: "rgba(245, 158, 11, 0.24)",
    badgeBorder: "rgba(245, 158, 11, 0.75)",
    badgeText: "#fbbf24",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#fde047", "#eab308"],
    accentColor: "#eab308",
    cardBorder: "rgba(245, 158, 11, 0.55)",
    cardGlow: "rgba(245, 158, 11, 0.28)",
    footerBg: "rgba(18, 14, 6, 0.94)",
  },
  cyan_glacier: {
    name: "Azul Eléctrico Pista",
    badgeBg: "rgba(6, 182, 212, 0.22)",
    badgeBorder: "rgba(6, 182, 212, 0.65)",
    badgeText: "#67e8f9",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#38bdf8", "#0284c7"],
    accentColor: "#06b6d4",
    cardBorder: "rgba(6, 182, 212, 0.5)",
    cardGlow: "rgba(6, 182, 212, 0.25)",
    footerBg: "rgba(6, 14, 24, 0.94)",
  },
  fire_sunset: {
    name: "Fuego & Competencia",
    badgeBg: "rgba(239, 68, 68, 0.22)",
    badgeBorder: "rgba(239, 68, 68, 0.65)",
    badgeText: "#f87171",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#fb923c", "#ef4444"],
    accentColor: "#ef4444",
    cardBorder: "rgba(239, 68, 68, 0.5)",
    cardGlow: "rgba(239, 68, 68, 0.25)",
    footerBg: "rgba(20, 6, 6, 0.94)",
  },
  cyber_violet: {
    name: "Cyber Violeta Pro",
    badgeBg: "rgba(168, 85, 247, 0.22)",
    badgeBorder: "rgba(168, 85, 247, 0.65)",
    badgeText: "#c084fc",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#e879f9", "#a855f7"],
    accentColor: "#a855f7",
    cardBorder: "rgba(168, 85, 247, 0.5)",
    cardGlow: "rgba(168, 85, 247, 0.25)",
    footerBg: "rgba(15, 6, 24, 0.94)",
  },
};

// Helper de dibujo de rectángulo redondeado
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Dibuja una imagen en el canvas garantizando SIEMPRE la preservación
 * estricta de su aspecto original (aspect ratio), centrada o alineada dentro del box.
 * NUNCA deforma ni estira el logotipo.
 */
function drawImageProportional(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  boxX: number,
  boxY: number,
  maxW: number,
  maxH: number,
  align: "left" | "center" | "right" = "center"
): { x: number; y: number; width: number; height: number } {
  const natW = img.naturalWidth || maxW;
  const natH = img.naturalHeight || maxH;
  const scale = Math.min(maxW / natW, maxH / natH);

  const drawW = Math.round(natW * scale);
  const drawH = Math.round(natH * scale);

  let drawX = boxX;
  if (align === "center") {
    drawX = boxX + Math.round((maxW - drawW) / 2);
  } else if (align === "right") {
    drawX = boxX + (maxW - drawW);
  }

  const drawY = boxY + Math.round((maxH - drawH) / 2);

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  return { x: drawX, y: drawY, width: drawW, height: drawH };
}

/**
 * Ajusta y renderiza texto multilínea garantizando que NUNCA desborde maxWidth
 * ni exceda maxLines (si se especifica).
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      if (lineCount >= maxLines - 1) {
        // Truncar con elipsis si excede maxLines
        let truncated = line.trim();
        while (ctx.measureText(truncated + "...").width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + "...", x, currentY);
        return currentY;
      }
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
      lineCount++;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY;
}

function wrapTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      if (lineCount >= maxLines - 1) {
        let truncated = line.trim();
        while (ctx.measureText(truncated + "...").width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + "...", centerX, currentY);
        return currentY;
      }
      ctx.fillText(line.trim(), centerX, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
      lineCount++;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), centerX, currentY);
  return currentY;
}

function wrapTextRight(
  ctx: CanvasRenderingContext2D,
  text: string,
  rightX: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      if (lineCount >= maxLines - 1) {
        let truncated = line.trim();
        while (ctx.measureText(truncated + "...").width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + "...", rightX, currentY);
        return currentY;
      }
      ctx.fillText(line.trim(), rightX, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
      lineCount++;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), rightX, currentY);
  return currentY;
}

// Barra inferior común de sponsors
function drawSponsorsBar(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  sponsors: string[],
  theme: ThemeConfig
) {
  const barY = 915;
  const barH = 165;
  ctx.fillStyle = theme.footerBg;
  ctx.fillRect(0, barY, W, barH);

  // Línea divisoria superior con degradado
  const sepGrad = ctx.createLinearGradient(0, barY, W, barY);
  sepGrad.addColorStop(0, "transparent");
  sepGrad.addColorStop(0.3, theme.accentColor);
  sepGrad.addColorStop(0.7, theme.accentColor);
  sepGrad.addColorStop(1, "transparent");
  ctx.fillStyle = sepGrad;
  ctx.fillRect(0, barY, W, 3);

  // Etiqueta SPONSORS
  ctx.font = "bold 20px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "left";
  ctx.fillText("MAIN SPONSORS & PARTNERS OFICIALES", 100, barY + 42);

  // Pills de sponsors
  const sponsorList =
    sponsors && sponsors.length > 0
      ? sponsors
      : ["HEAD PADEL", "BULLPADEL", "NOX PADEL", "WILSON", "BABOLAT", "MUNICH"];

  let spX = 100;
  const spY = barY + 68;
  const spH = 58;

  sponsorList.slice(0, 6).forEach((spon) => {
    ctx.font = "bold 22px 'Inter', sans-serif";
    const tw = ctx.measureText(spon.toUpperCase()).width;
    const spW = Math.max(tw + 48, 140);

    roundRect(ctx, spX, spY, spW, spH, 12);
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(spon.toUpperCase(), spX + spW / 2, spY + spH / 2);
    ctx.textBaseline = "alphabetic";

    spX += spW + 20;
  });
}

/**
 * LAYOUT 1: split_card (Clásico Asimétrico)
 * Logo: Superior Izquierda (Ancho >= 20% del canvas = 420px, relación 2.56:1 nativa)
 * Título: Izquierda masivo
 * Tarjeta: Derecha vertical
 */
function renderLayoutSplitCard(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: FlyerRenderData,
  theme: ThemeConfig,
  logoImage?: HTMLImageElement | null
) {
  // 1. LOGO SPT SUPERIOR IZQUIERDA (Ancho >= 20% de 1920px -> 420px x 165px)
  const maxLogoW = 420;
  const maxLogoH = 165;
  const logoX = 90;
  const logoY = 50;

  let actualDrawnW = maxLogoW;
  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(245, 158, 11, 0.45)";
    ctx.shadowBlur = 18;
    const drawn = drawImageProportional(
      ctx,
      logoImage,
      logoX,
      logoY,
      maxLogoW,
      maxLogoH,
      "left"
    );
    actualDrawnW = drawn.width;
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, maxLogoW, 140, 16);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "900 24px 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SALADILLO PADEL TOUR", logoX + maxLogoW / 2, logoY + 75);
  }

  // Badge categoría al lado del logo
  const badgeX = logoX + actualDrawnW + 28;
  const badgeY = logoY + 55;
  const badgeText = data.category ? data.category.toUpperCase() : "TORNEO OFICIAL";
  ctx.font = "900 20px 'Inter', sans-serif";
  const catWidth = ctx.measureText(badgeText).width + 42;
  const badgeH = 54;

  roundRect(ctx, badgeX, badgeY, catWidth, badgeH, 27);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + catWidth / 2, badgeY + 34);

  // 2. TÍTULO PRINCIPAL (COLUMNA IZQUIERDA)
  const titleY = 285;
  ctx.font = "900 72px 'Inter', sans-serif";
  ctx.textAlign = "left";

  const tGrad = ctx.createLinearGradient(90, titleY, 900, titleY + 160);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  // Ajustado a 940px para que nunca desborde hacia la tarjeta derecha
  wrapText(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), 90, titleY, 940, 84, 3);

  // Línea de acento decorativa
  ctx.fillStyle = theme.accentColor;
  ctx.fillRect(90, 520, 140, 6);

  // Subtítulo / Bajada informativa
  ctx.font = "600 24px 'Inter', sans-serif";
  ctx.fillStyle = "#e2e8f0";
  wrapText(
    ctx,
    "¡Viví la emoción del mejor pádel de la provincia! Inscripciones abiertas para todas las parejas.",
    90,
    570,
    940,
    38,
    3
  );

  // CTA Button (Izquierda)
  const ctaW = 380;
  const ctaH = 68;
  const ctaX = 90;
  const ctaY = 750;

  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 16);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, theme.brandGradient[1]);
  ctaGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = ctaGrad;
  ctx.fill();

  ctx.font = "900 24px 'Inter', sans-serif";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.fillText("¡SUMATE AL CUADRO! ⚡", ctaX + ctaW / 2, ctaY + 43);

  // 3. TARJETA VERTICAL LATERAL (DERECHA)
  const cardX = 1100;
  const cardY = 110;
  const cardW = 730;
  const cardH = 760;

  ctx.save();
  ctx.shadowColor = theme.cardGlow;
  ctx.shadowBlur = 35;
  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.fill();
  ctx.restore();

  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  roundRect(ctx, cardX, cardY, cardW, 80, 28);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fill();

  ctx.font = "900 24px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText("INFORMACIÓN DEL EVENTO", cardX + 45, cardY + 50);

  // Fila 1: FECHA
  const row1Y = cardY + 150;
  ctx.font = "700 16px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📅 CRONOGRAMA & FECHAS", cardX + 45, row1Y);

  ctx.font = "800 32px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.date || "PRÓXIMAMENTE").toUpperCase(), cardX + 45, row1Y + 42, cardW - 90, 38, 2);

  // Fila 2: SEDE
  const row2Y = cardY + 280;
  ctx.font = "700 16px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📍 COMPLEJO & UBICACIÓN", cardX + 45, row2Y);

  ctx.font = "800 30px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.location || "SALADILLO, BUENOS AIRES").toUpperCase(), cardX + 45, row2Y + 42, cardW - 90, 38, 2);

  // Fila 3: PREMIOS DESTACADOS
  const row3Y = cardY + 430;
  const prizeBoxW = cardW - 90;
  const prizeBoxH = 190;

  roundRect(ctx, cardX + 45, row3Y, prizeBoxW, prizeBoxH, 20);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "900 20px 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.fillText("🏆 BOLSA DE PREMIOS OFICIAL", cardX + 70, row3Y + 45);

  ctx.font = "900 44px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.prizes || "TROFEOS + EFECTIVO").toUpperCase(), cardX + 70, row3Y + 115, prizeBoxW - 40, 48, 1);

  ctx.font = "600 18px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("Indumentaria pro + Puntos para el ranking anual", cardX + 70, row3Y + 155);

  // Fila 4: Footer de tarjeta
  ctx.font = "bold 18px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "center";
  ctx.fillText("INSCRIPCIÓN ONLINE EN LA PLATAFORMA OFICIAL", cardX + cardW / 2, cardY + cardH - 35);
}

/**
 * LAYOUT 2: hero_center (Impacto Central)
 * Logo: Centro Superior (X=960, Ancho >= 20% = 450px, proporción 2.56:1 nativa)
 * Título: Centrado masivo
 * Tarjetas: 3 módulos horizontales podio (Fecha, Premios destacado, Sede)
 * CTA: Central abajo
 */
function renderLayoutHeroCenter(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: FlyerRenderData,
  theme: ThemeConfig,
  logoImage?: HTMLImageElement | null
) {
  const centerX = W / 2;

  // 1. HALO LUMINOSO CENTRAL
  const haloGrad = ctx.createRadialGradient(centerX, 105, 10, centerX, 105, 260);
  haloGrad.addColorStop(0, theme.cardGlow);
  haloGrad.addColorStop(1, "transparent");
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(centerX, 105, 260, 0, Math.PI * 2);
  ctx.fill();

  // 2. LOGO SPT CENTRO SUPERIOR (Ancho >= 20% de 1920px -> 450px x 175px)
  const maxLogoW = 450;
  const maxLogoH = 175;
  const logoX = centerX - maxLogoW / 2;
  const logoY = 35;

  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(245, 158, 11, 0.6)";
    ctx.shadowBlur = 24;
    drawImageProportional(
      ctx,
      logoImage,
      logoX,
      logoY,
      maxLogoW,
      maxLogoH,
      "center"
    );
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, maxLogoW, 140, 20);
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.font = "900 28px 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SALADILLO PADEL TOUR", centerX, logoY + 75);
  }

  // Pill de Categoría justo abajo del logo
  const catText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 18px 'Inter', sans-serif";
  const catW = ctx.measureText(catText).width + 48;
  const catY = 195;
  roundRect(ctx, centerX - catW / 2, catY, catW, 42, 21);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(catText, centerX, catY + 28);

  // 3. TÍTULO CENTRADO GIGANTE
  const titleY = 295;
  ctx.font = "900 74px 'Inter', sans-serif";
  ctx.textAlign = "center";

  const tGrad = ctx.createLinearGradient(centerX - 400, titleY, centerX + 400, titleY + 80);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  // Ajustado a 1500px para que quepa holgadamente dentro de los márgenes
  wrapTextCentered(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), centerX, titleY, 1500, 84, 2);

  // Subtítulo central
  ctx.font = "600 24px 'Inter', sans-serif";
  ctx.fillStyle = "#e2e8f0";
  ctx.textAlign = "center";
  ctx.fillText("Inscripciones abiertas • Cupos limitados para todas las categorías", centerX, 440);

  // 4. TRES TARJETAS HORIZONTALES (PODIO)
  const modY = 485;
  const modH = 260;
  const gap = 30;
  const totalW = 1660;
  const modW = (totalW - gap * 2) / 3;
  const startX = (W - totalW) / 2;

  // Tarjeta 1: FECHA
  const card1X = startX;
  roundRect(ctx, card1X, modY, modW, modH, 24);
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "900 20px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "center";
  ctx.fillText("📅 CRONOGRAMA", card1X + modW / 2, modY + 50);

  ctx.font = "900 32px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapTextCentered(ctx, (data.date || "PRÓXIMAMENTE").toUpperCase(), card1X + modW / 2, modY + 115, modW - 40, 40, 2);

  ctx.font = "600 18px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Turnos y cuadros confirmados", card1X + modW / 2, modY + 215);

  // Tarjeta 2: PREMIOS (Tarjeta destacada central)
  const card2X = startX + modW + gap;
  roundRect(ctx, card2X, modY - 15, modW, modH + 30, 24);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = "900 22px 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText("🏆 BOLSA DE PREMIOS", card2X + modW / 2, modY + 45);

  ctx.font = "900 40px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapTextCentered(ctx, (data.prizes || "$500.000 EN EFECTIVO").toUpperCase(), card2X + modW / 2, modY + 115, modW - 40, 46, 2);

  ctx.font = "700 18px 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.fillText("+ Palas Pro + Puntos del Ranking", card2X + modW / 2, modY + 225);

  // Tarjeta 3: SEDE
  const card3X = startX + (modW + gap) * 2;
  roundRect(ctx, card3X, modY, modW, modH, 24);
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "900 20px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "center";
  ctx.fillText("📍 SEDE & CLUB", card3X + modW / 2, modY + 50);

  ctx.font = "900 30px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapTextCentered(ctx, (data.location || "COMPLEJO CENTRAL").toUpperCase(), card3X + modW / 2, modY + 115, modW - 40, 36, 2);

  ctx.font = "600 18px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Canchas de cristal indoor", card3X + modW / 2, modY + 215);

  // 5. CTA BUTTON CENTRAL
  const ctaW = 460;
  const ctaH = 68;
  const ctaX = centerX - ctaW / 2;
  const ctaY = 800;

  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 18);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, theme.brandGradient[1]);
  ctaGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = ctaGrad;
  ctx.fill();

  ctx.font = "900 24px 'Inter', sans-serif";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.fillText("INSCRIPCIONES ABIERTAS AHORA 🎾", centerX, ctaY + 43);
}

/**
 * LAYOUT 3: split_inverted (Invertido Vanguardia)
 * Logo: Superior Derecha (Ancho >= 20% = 420px x 165px, proporción nativa)
 * Título: Derecha alineado
 * Tarjeta: Izquierda vertical
 */
function renderLayoutSplitInverted(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: FlyerRenderData,
  theme: ThemeConfig,
  logoImage?: HTMLImageElement | null
) {
  // 1. LOGO SUPERIOR DERECHA (Ancho >= 20% = 420px)
  const maxLogoW = 420;
  const maxLogoH = 165;
  const logoX = W - 90 - maxLogoW;
  const logoY = 50;

  let actualDrawnW = maxLogoW;
  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(245, 158, 11, 0.45)";
    ctx.shadowBlur = 18;
    const drawn = drawImageProportional(
      ctx,
      logoImage,
      logoX,
      logoY,
      maxLogoW,
      maxLogoH,
      "right"
    );
    actualDrawnW = drawn.width;
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, maxLogoW, 140, 16);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "900 24px 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SALADILLO PADEL TOUR", logoX + maxLogoW / 2, logoY + 75);
  }

  // Badge categoría al lado izquierdo del logo
  const badgeText = data.category ? data.category.toUpperCase() : "TORNEO OFICIAL";
  ctx.font = "900 20px 'Inter', sans-serif";
  const catWidth = ctx.measureText(badgeText).width + 42;
  const badgeX = (W - 90 - actualDrawnW) - catWidth - 28;
  const badgeY = logoY + 55;

  roundRect(ctx, badgeX, badgeY, catWidth, 54, 27);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + catWidth / 2, badgeY + 34);

  // 2. TARJETA VERTICAL A LA IZQUIERDA
  const cardX = 90;
  const cardY = 110;
  const cardW = 730;
  const cardH = 760;

  ctx.save();
  ctx.shadowColor = theme.cardGlow;
  ctx.shadowBlur = 35;
  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.fill();
  ctx.restore();

  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Encabezado tarjeta
  roundRect(ctx, cardX, cardY, cardW, 80, 28);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fill();

  ctx.font = "900 24px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText("COORDENADAS DE COMPETENCIA", cardX + 45, cardY + 50);

  // Fila 1: FECHA
  const row1Y = cardY + 150;
  ctx.font = "700 16px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📅 FECHA DE DISPUTA", cardX + 45, row1Y);

  ctx.font = "800 32px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.date || "PRÓXIMAMENTE").toUpperCase(), cardX + 45, row1Y + 42, cardW - 90, 38, 2);

  // Fila 2: SEDE
  const row2Y = cardY + 280;
  ctx.font = "700 16px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📍 COMPLEJO SEDE", cardX + 45, row2Y);

  ctx.font = "800 30px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.location || "SALADILLO, BUENOS AIRES").toUpperCase(), cardX + 45, row2Y + 42, cardW - 90, 38, 2);

  // Fila 3: PREMIOS
  const row3Y = cardY + 430;
  const prizeBoxW = cardW - 90;
  const prizeBoxH = 190;

  roundRect(ctx, cardX + 45, row3Y, prizeBoxW, prizeBoxH, 20);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "900 20px 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.fillText("🏆 PREMIOS Y RECONOCIMIENTO", cardX + 70, row3Y + 45);

  ctx.font = "900 44px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.prizes || "TROFEOS + EFECTIVO").toUpperCase(), cardX + 70, row3Y + 115, prizeBoxW - 40, 48, 1);

  ctx.font = "600 18px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("Suma puntos para el Master Final anual", cardX + 70, row3Y + 155);

  // Footer tarjeta
  ctx.font = "bold 18px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "center";
  ctx.fillText("INSCRIPCIONES ABIERTAS EN LA PLATAFORMA OFICIAL", cardX + cardW / 2, cardY + cardH - 35);

  // 3. TÍTULO Y CONTENIDO A LA DERECHA (ALINEADO A LA DERECHA)
  const rightX = W - 90;
  const titleY = 285;

  ctx.font = "900 72px 'Inter', sans-serif";
  const tGrad = ctx.createLinearGradient(rightX - 700, titleY, rightX, titleY + 160);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  // Ajustado a 940px para que nunca desborde hacia la tarjeta izquierda
  wrapTextRight(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), rightX, titleY, 940, 84, 3);

  // Línea de acento a la derecha
  ctx.fillStyle = theme.accentColor;
  ctx.fillRect(rightX - 140, 520, 140, 6);

  // Subtítulo
  ctx.font = "600 24px 'Inter', sans-serif";
  ctx.fillStyle = "#e2e8f0";
  wrapTextRight(
    ctx,
    "Demostrá tu nivel en la pista más competitiva. Cupos estrictamente limitados por orden de inscripción.",
    rightX,
    570,
    940,
    38,
    3
  );

  // CTA Button (Alineado a la derecha)
  const ctaW = 400;
  const ctaH = 68;
  const ctaX = rightX - ctaW;
  const ctaY = 750;

  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 16);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, theme.brandGradient[1]);
  ctaGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = ctaGrad;
  ctx.fill();

  ctx.font = "900 24px 'Inter', sans-serif";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.fillText("¡ANOTATE CON TU PAREJA! ⚡", ctaX + ctaW / 2, ctaY + 43);
}

/**
 * LAYOUT 4: magazine_bold (Editorial Deportivo)
 * Logo: Cabecera superior panorámica (Ancho >= 20% = 400px x 110px, proporción nativa)
 * Cabecera: Cinta panorámica superior con categoría
 * Titular: Masivo superior-medio
 * Módulos: Dos tarjetas gemelas (Fecha / Sede) y una tarjeta horizontal dorada de premios
 */
function renderLayoutMagazineBold(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: FlyerRenderData,
  theme: ThemeConfig,
  logoImage?: HTMLImageElement | null
) {
  // 1. CINTA SUPERIOR PANORÁMICA
  const bannerY = 45;
  const bannerH = 125;
  roundRect(ctx, 80, bannerY, W - 160, bannerH, 20);
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Badge categoría en la cinta (Izquierda)
  const catText = (data.category || "CATEGORÍA ABIERTA").toUpperCase();
  ctx.font = "900 24px 'Inter', sans-serif";
  const catW = ctx.measureText(catText).width + 52;
  const catX = 120;
  roundRect(ctx, catX, bannerY + 32, catW, 58, 29);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(catText, catX + catW / 2, bannerY + 68);

  // 2. LOGO EN LA CINTA A LA DERECHA (Ancho >= 20% = 400px x 110px, proporción original)
  const maxLogoW = 400;
  const maxLogoH = 110;
  const logoX = W - 120 - maxLogoW;
  const logoY = bannerY + 8;

  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(245, 158, 11, 0.45)";
    ctx.shadowBlur = 16;
    drawImageProportional(
      ctx,
      logoImage,
      logoX,
      logoY,
      maxLogoW,
      maxLogoH,
      "right"
    );
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, maxLogoW, 95, 14);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "900 22px 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SALADILLO PADEL TOUR", logoX + maxLogoW / 2, logoY + 54);
  }

  // 3. TITULAR EDITORIAL MASIVO
  const titleY = 250;
  ctx.font = "900 80px 'Inter', sans-serif";
  ctx.textAlign = "left";

  const tGrad = ctx.createLinearGradient(80, titleY, 1200, titleY + 120);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.6, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  // Ajustado con maxLines 2 a 1760px
  wrapText(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), 80, titleY, 1760, 88, 2);

  // 4. MÓDULOS DE CONTENIDO
  // Módulo A: FECHA (Izquierda)
  const modY = 440;
  const colW = 540;
  const colH = 220;

  roundRect(ctx, 80, modY, colW, colH, 22);
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "900 18px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "left";
  ctx.fillText("📅 FECHA DE JUEGO", 115, modY + 45);

  ctx.font = "900 32px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.date || "PRÓXIMO FIN DE SEMANA").toUpperCase(), 115, modY + 105, colW - 70, 38, 2);

  ctx.font = "600 16px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Fase de grupos + Playoffs eliminatorios", 115, modY + 185);

  // Módulo B: SEDE (Centro)
  const col2X = 80 + colW + 30;
  roundRect(ctx, col2X, modY, colW, colH, 22);
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "900 18px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📍 COMPLEJO OFICIAL", col2X + 35, modY + 45);

  ctx.font = "900 30px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.location || "COMPLEJO CENTRAL").toUpperCase(), col2X + 35, modY + 105, colW - 70, 36, 2);

  ctx.font = "600 16px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Vestuarios, bar y tribuna con vista panorámica", col2X + 35, modY + 185);

  // Módulo C: PREMIOS + CTA (Derecha, ancho destacado)
  const col3X = col2X + colW + 30;
  const col3W = W - col3X - 80;

  roundRect(ctx, col3X, modY, col3W, colH + 215, 24);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = "900 22px 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText("🏆 PREMIOS PRINCIPALES", col3X + col3W / 2, modY + 55);

  ctx.font = "900 46px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapTextCentered(ctx, (data.prizes || "PREMIOS EN EFECTIVO").toUpperCase(), col3X + col3W / 2, modY + 125, col3W - 40, 48, 2);

  ctx.font = "700 20px 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.fillText("+ Trofeos para Campeones y Finalistas", col3X + col3W / 2, modY + 245);

  ctx.font = "600 18px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("Indumentaria técnica oficial", col3X + col3W / 2, modY + 285);

  // CTA integrado en tarjeta derecha
  const ctaH = 68;
  const ctaW = col3W - 70;
  const ctaX = col3X + 35;
  const ctaY = modY + 340;

  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 16);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, theme.brandGradient[1]);
  ctaGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = ctaGrad;
  ctx.fill();

  ctx.font = "900 24px 'Inter', sans-serif";
  ctx.fillStyle = "#000000";
  ctx.fillText("RESERVAR LUGAR AHORA ⚡", col3X + col3W / 2, ctaY + 43);

  // Frase publicitaria izquierda abajo
  const bottomBoxX = 80;
  const bottomBoxY = modY + colH + 25;
  const bottomBoxW = colW * 2 + 30;
  const bottomBoxH = 190;

  roundRect(ctx, bottomBoxX, bottomBoxY, bottomBoxW, bottomBoxH, 20);
  ctx.fillStyle = "rgba(10, 15, 29, 0.7)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 22px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "left";
  ctx.fillText("⭐ COMPETICIÓN DE MÁXIMO NIVEL", bottomBoxX + 35, bottomBoxY + 50);

  ctx.font = "600 20px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  wrapText(
    ctx,
    "Todos los partidos cuentan para el Ranking General Anual. Transmisión de finales en vivo y cobertura fotográfica profesional de cada encuentro.",
    bottomBoxX + 35,
    bottomBoxY + 95,
    bottomBoxW - 70,
    32,
    3
  );
}

/**
 * Función principal de renderizado en Canvas (1920x1080)
 */
export function renderFlyerOnCanvas(
  canvas: HTMLCanvasElement,
  bgImage: HTMLImageElement | null,
  data: FlyerRenderData,
  logoImage?: HTMLImageElement | null
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = (canvas.width = 1920);
  const H = (canvas.height = 1080);
  const activeTheme = THEMES[data.theme || "neon_emerald"] || THEMES.neon_emerald;
  const activeLayout = data.layout || "split_card";

  // 1. LIMPIAR CANVAS
  ctx.clearRect(0, 0, W, H);

  // 2. FONDO PRINCIPAL (LUMINOSO Y NÍTIDO, SIN OSCURECER TANTO)
  if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
    const scale = Math.max(W / bgImage.naturalWidth, H / bgImage.naturalHeight);
    const sw = bgImage.naturalWidth * scale;
    const sh = bgImage.naturalHeight * scale;
    const sx = (W - sw) / 2;
    const sy = (H - sh) / 2;

    ctx.drawImage(bgImage, sx, sy, sw, sh);

    // Velo suave transparente para permitir que se aprecie la foto con claridad y contraste
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "rgba(4, 9, 20, 0.40)");
    grad.addColorStop(0.5, "rgba(4, 9, 20, 0.25)");
    grad.addColorStop(1, "rgba(4, 9, 20, 0.50)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else {
    // Gradiente de fallback
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#09101f");
    grad.addColorStop(0.5, "#15203b");
    grad.addColorStop(1, "#09101f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // 3. RENDERIZAR SEGÚN EL DISEÑO SELECCIONADO
  switch (activeLayout) {
    case "hero_center":
      renderLayoutHeroCenter(ctx, W, H, data, activeTheme, logoImage);
      break;
    case "split_inverted":
      renderLayoutSplitInverted(ctx, W, H, data, activeTheme, logoImage);
      break;
    case "magazine_bold":
      renderLayoutMagazineBold(ctx, W, H, data, activeTheme, logoImage);
      break;
    case "split_card":
    default:
      renderLayoutSplitCard(ctx, W, H, data, activeTheme, logoImage);
      break;
  }

  // 4. BARRA INFERIOR DE SPONSORS (COMÚN Y HOMOGÉNEA)
  drawSponsorsBar(ctx, W, H, data.sponsors, activeTheme);
}
