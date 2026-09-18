/**
 * SPT (Saladillo Padel Tour) - Canvas Flyer Compositor
 * Renderiza composiciones vectoriales en formato HORIZONTAL (1920x1080 px - 16:9)
 *
 * ESPECIFICACIONES DE DISEÑO Y PROPORCIONES:
 * - Logo LOGOSPT.png con un ancho exacto del 35% del total del flyer (672 px),
 *   respetando al 100% su relación de aspecto original (nunca deformado).
 * - Optimización completa del espacio: elementos ampliados y reorganizados para
 *   eliminar espacios ociosos o vacíos.
 * - Fondos luminosos y nítidos: sobreimpresión ultra ligera que permite lucir la foto
 *   de fondo con total claridad.
 * - Libre de frases redundantes: la marca queda representada con máxima prestancia por LOGOSPT.png.
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
    description: "Logo destacado superior izquierda (35% ancho), títulos y tarjeta vertical lateral",
    logoPosition: "Superior Izquierda (35% Ancho)",
  },
  hero_center: {
    name: "Impacto Central",
    description: "Logo central panorámico (35% ancho) con halo dorado, títulos y 3 módulos podio",
    logoPosition: "Centro Superior (35% Ancho)",
  },
  split_inverted: {
    name: "Invertido Vanguardia",
    description: "Logo superior derecha (35% ancho), tarjeta vertical izquierda y títulos a derecha",
    logoPosition: "Superior Derecha (35% Ancho)",
  },
  magazine_bold: {
    name: "Editorial Deportivo",
    description: "Logo panorámico superior (35% ancho) con titular imponente y módulos gemelos",
    logoPosition: "Superior Panorámica (35% Ancho)",
  },
};

export const THEMES: Record<FlyerTheme, ThemeConfig> = {
  neon_emerald: {
    name: "Verde Neón Oficial",
    badgeBg: "rgba(34, 197, 94, 0.25)",
    badgeBorder: "rgba(34, 197, 94, 0.8)",
    badgeText: "#4ade80",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#4ade80", "#22c55e"],
    accentColor: "#22c55e",
    cardBorder: "rgba(34, 197, 94, 0.55)",
    cardGlow: "rgba(34, 197, 94, 0.28)",
    footerBg: "rgba(6, 16, 12, 0.94)",
  },
  gold_luxury: {
    name: "Oro & Platino Master",
    badgeBg: "rgba(245, 158, 11, 0.26)",
    badgeBorder: "rgba(245, 158, 11, 0.85)",
    badgeText: "#fbbf24",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#fde047", "#eab308"],
    accentColor: "#eab308",
    cardBorder: "rgba(245, 158, 11, 0.6)",
    cardGlow: "rgba(245, 158, 11, 0.3)",
    footerBg: "rgba(18, 14, 6, 0.94)",
  },
  cyan_glacier: {
    name: "Azul Eléctrico Pista",
    badgeBg: "rgba(6, 182, 212, 0.25)",
    badgeBorder: "rgba(6, 182, 212, 0.75)",
    badgeText: "#67e8f9",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#38bdf8", "#0284c7"],
    accentColor: "#06b6d4",
    cardBorder: "rgba(6, 182, 212, 0.55)",
    cardGlow: "rgba(6, 182, 212, 0.28)",
    footerBg: "rgba(6, 14, 24, 0.94)",
  },
  fire_sunset: {
    name: "Fuego & Competencia",
    badgeBg: "rgba(239, 68, 68, 0.25)",
    badgeBorder: "rgba(239, 68, 68, 0.75)",
    badgeText: "#f87171",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#fb923c", "#ef4444"],
    accentColor: "#ef4444",
    cardBorder: "rgba(239, 68, 68, 0.55)",
    cardGlow: "rgba(239, 68, 68, 0.28)",
    footerBg: "rgba(20, 6, 6, 0.94)",
  },
  cyber_violet: {
    name: "Cyber Violeta Pro",
    badgeBg: "rgba(168, 85, 247, 0.25)",
    badgeBorder: "rgba(168, 85, 247, 0.75)",
    badgeText: "#c084fc",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#e879f9", "#a855f7"],
    accentColor: "#a855f7",
    cardBorder: "rgba(168, 85, 247, 0.55)",
    cardGlow: "rgba(168, 85, 247, 0.28)",
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
 * estricta de su aspecto original (aspect ratio), dentro del box delimitador.
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
  maxLines = 3
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
  maxLines = 3
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
  maxLines = 3
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
  const barY = 910;
  const barH = 170;
  ctx.fillStyle = theme.footerBg;
  ctx.fillRect(0, barY, W, barH);

  // Línea divisoria superior con degradado
  const sepGrad = ctx.createLinearGradient(0, barY, W, barY);
  sepGrad.addColorStop(0, "transparent");
  sepGrad.addColorStop(0.3, theme.accentColor);
  sepGrad.addColorStop(0.7, theme.accentColor);
  sepGrad.addColorStop(1, "transparent");
  ctx.fillStyle = sepGrad;
  ctx.fillRect(0, barY, W, 3.5);

  // Etiqueta SPONSORS
  ctx.font = "bold 20px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "left";
  ctx.fillText("MAIN SPONSORS & PARTNERS OFICIALES", 70, barY + 42);

  // Pills de sponsors
  const sponsorList =
    sponsors && sponsors.length > 0
      ? sponsors
      : ["HEAD PADEL", "BULLPADEL", "NOX PADEL", "WILSON", "BABOLAT", "MUNICH"];

  let spX = 70;
  const spY = barY + 68;
  const spH = 62;

  sponsorList.slice(0, 6).forEach((spon) => {
    ctx.font = "bold 24px 'Inter', sans-serif";
    const tw = ctx.measureText(spon.toUpperCase()).width;
    const spW = Math.max(tw + 52, 160);

    roundRect(ctx, spX, spY, spW, spH, 14);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(spon.toUpperCase(), spX + spW / 2, spY + spH / 2);
    ctx.textBaseline = "alphabetic";

    spX += spW + 24;
  });
}

/**
 * LAYOUT 1: split_card (Clásico Asimétrico)
 * Logo: Superior Izquierda -> EXACTAMENTE 35% DEL ANCHO (672 px x 262 px)
 * Distribución optimizada sin espacios ociosos
 */
function renderLayoutSplitCard(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: FlyerRenderData,
  theme: ThemeConfig,
  logoImage?: HTMLImageElement | null
) {
  // 1. LOGO SPT SUPERIOR IZQUIERDA: 35% exacto de 1920px = 672px
  const logoW = 672;
  const logoH = 262;
  const logoX = 70;
  const logoY = 40;

  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(245, 158, 11, 0.4)";
    ctx.shadowBlur = 20;
    drawImageProportional(ctx, logoImage, logoX, logoY, logoW, logoH, "left");
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, logoW, logoH, 20);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.font = "900 32px 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SALADILLO PADEL TOUR", logoX + logoW / 2, logoY + logoH / 2 + 10);
  }

  // Badge categoría alineado inmediatamente debajo del logo para optimizar el espacio vertical
  const badgeX = logoX;
  const badgeY = logoY + logoH + 20;
  const badgeText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 24px 'Inter', sans-serif";
  const catWidth = ctx.measureText(badgeText).width + 56;
  const badgeH = 56;

  roundRect(ctx, badgeX, badgeY, catWidth, badgeH, 28);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + catWidth / 2, badgeY + 36);

  // 2. TÍTULO PRINCIPAL (COLUMNA IZQUIERDA)
  const titleY = badgeY + badgeH + 75;
  ctx.font = "900 84px 'Inter', sans-serif";
  ctx.textAlign = "left";

  const tGrad = ctx.createLinearGradient(70, titleY, 950, titleY + 160);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  wrapText(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), 70, titleY, 930, 92, 2);

  // Línea de acento decorativa
  ctx.fillStyle = theme.accentColor;
  ctx.fillRect(70, titleY + 110, 180, 8);

  // Subtítulo informativo
  ctx.font = "600 28px 'Inter', sans-serif";
  ctx.fillStyle = "#f1f5f9";
  wrapText(
    ctx,
    "¡Viví la emoción del mejor pádel! Inscripciones abiertas para todas las parejas de la región.",
    70,
    titleY + 160,
    930,
    42,
    2
  );

  // CTA Button (Izquierda abajo)
  const ctaW = 460;
  const ctaH = 78;
  const ctaX = 70;
  const ctaY = 790;

  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 20);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, theme.brandGradient[1]);
  ctaGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = ctaGrad;
  ctx.fill();

  ctx.font = "900 26px 'Inter', sans-serif";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.fillText("¡SUMATE AL CUADRO! ⚡", ctaX + ctaW / 2, ctaY + 48);

  // 3. TARJETA VERTICAL LATERAL (DERECHA) - LLENA EL ESPACIO COMPLETO
  const cardX = 1040;
  const cardY = 50;
  const cardW = 810;
  const cardH = 825;

  ctx.save();
  ctx.shadowColor = theme.cardGlow;
  ctx.shadowBlur = 40;
  roundRect(ctx, cardX, cardY, cardW, cardH, 30);
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.fill();
  ctx.restore();

  roundRect(ctx, cardX, cardY, cardW, cardH, 30);
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 3;
  ctx.stroke();

  roundRect(ctx, cardX, cardY, cardW, 85, 30);
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.fill();

  ctx.font = "900 28px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText("INFORMACIÓN DEL TORNEO", cardX + 50, cardY + 54);

  // Fila 1: FECHA
  const row1Y = cardY + 160;
  ctx.font = "800 20px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📅 CRONOGRAMA DE DISPUTA", cardX + 50, row1Y);

  ctx.font = "900 38px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.date || "PRÓXIMAMENTE").toUpperCase(), cardX + 50, row1Y + 48, cardW - 100, 44, 2);

  // Fila 2: SEDE
  const row2Y = cardY + 310;
  ctx.font = "800 20px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📍 COMPLEJO & UBICACIÓN", cardX + 50, row2Y);

  ctx.font = "900 36px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.location || "SALADILLO, BUENOS AIRES").toUpperCase(), cardX + 50, row2Y + 48, cardW - 100, 42, 2);

  // Fila 3: PREMIOS DESTACADOS
  const row3Y = cardY + 475;
  const prizeBoxW = cardW - 100;
  const prizeBoxH = 220;

  roundRect(ctx, cardX + 50, row3Y, prizeBoxW, prizeBoxH, 24);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = "900 24px 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.fillText("🏆 BOLSA DE PREMIOS OFICIAL", cardX + 80, row3Y + 52);

  ctx.font = "900 52px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.prizes || "TROFEOS + EFECTIVO").toUpperCase(), cardX + 80, row3Y + 128, prizeBoxW - 50, 54, 1);

  ctx.font = "600 20px 'Inter', sans-serif";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText("Indumentaria pro + Puntos para el ranking anual SPT", cardX + 80, row3Y + 175);

  // Fila 4: Footer de tarjeta
  ctx.font = "bold 20px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "center";
  ctx.fillText("INSCRIPCIÓN ONLINE OFICIAL EN SPT-PADEL-TOUR.COM", cardX + cardW / 2, cardY + cardH - 40);
}

/**
 * LAYOUT 2: hero_center (Impacto Central)
 * Logo: Centro Superior -> EXACTAMENTE 35% DEL ANCHO (672 px x 262 px)
 * Módulos ampliados para ocupar todo el lienzo sin huecos
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
  const haloGrad = ctx.createRadialGradient(centerX, 150, 10, centerX, 150, 320);
  haloGrad.addColorStop(0, theme.cardGlow);
  haloGrad.addColorStop(1, "transparent");
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(centerX, 150, 320, 0, Math.PI * 2);
  ctx.fill();

  // 2. LOGO SPT CENTRO SUPERIOR (35% exacto de 1920px -> 672px x 262px)
  const logoW = 672;
  const logoH = 262;
  const logoX = centerX - logoW / 2;
  const logoY = 25;

  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(245, 158, 11, 0.5)";
    ctx.shadowBlur = 24;
    drawImageProportional(ctx, logoImage, logoX, logoY, logoW, logoH, "center");
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, logoW, logoH, 20);
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = "900 36px 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SALADILLO PADEL TOUR", centerX, logoY + logoH / 2 + 12);
  }

  // Pill de Categoría justo abajo del logo
  const catText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 22px 'Inter', sans-serif";
  const catW = ctx.measureText(catText).width + 60;
  const catY = logoY + logoH + 15;
  roundRect(ctx, centerX - catW / 2, catY, catW, 50, 25);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(catText, centerX, catY + 33);

  // 3. TÍTULO CENTRADO GIGANTE
  const titleY = catY + 105;
  ctx.font = "900 82px 'Inter', sans-serif";
  ctx.textAlign = "center";

  const tGrad = ctx.createLinearGradient(centerX - 500, titleY, centerX + 500, titleY + 80);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  wrapTextCentered(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), centerX, titleY, 1720, 88, 1);

  // 4. TRES TARJETAS HORIZONTALES (PODIO) - EXPANDIDAS PARA REDUCIR ESPACIO OCIOSO
  const modY = titleY + 50;
  const modH = 265;
  const gap = 30;
  const totalW = 1780;
  const modW = (totalW - gap * 2) / 3;
  const startX = (W - totalW) / 2;

  // Tarjeta 1: FECHA
  const card1X = startX;
  roundRect(ctx, card1X, modY, modW, modH, 24);
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = "900 22px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "center";
  ctx.fillText("📅 CRONOGRAMA", card1X + modW / 2, modY + 50);

  ctx.font = "900 36px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapTextCentered(ctx, (data.date || "PRÓXIMAMENTE").toUpperCase(), card1X + modW / 2, modY + 115, modW - 40, 42, 2);

  ctx.font = "600 20px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("Turnos y cuadros confirmados", card1X + modW / 2, modY + 220);

  // Tarjeta 2: PREMIOS (Tarjeta destacada central con altura extendida)
  const card2X = startX + modW + gap;
  roundRect(ctx, card2X, modY - 15, modW, modH + 30, 26);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.font = "900 24px 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText("🏆 BOLSA DE PREMIOS", card2X + modW / 2, modY + 45);

  ctx.font = "900 46px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapTextCentered(ctx, (data.prizes || "$500.000 EN EFECTIVO").toUpperCase(), card2X + modW / 2, modY + 120, modW - 40, 50, 2);

  ctx.font = "700 20px 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.fillText("+ Palas Pro + Puntos del Ranking", card2X + modW / 2, modY + 235);

  // Tarjeta 3: SEDE
  const card3X = startX + (modW + gap) * 2;
  roundRect(ctx, card3X, modY, modW, modH, 24);
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = "900 22px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "center";
  ctx.fillText("📍 SEDE & CLUB", card3X + modW / 2, modY + 50);

  ctx.font = "900 34px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapTextCentered(ctx, (data.location || "COMPLEJO CENTRAL").toUpperCase(), card3X + modW / 2, modY + 115, modW - 40, 40, 2);

  ctx.font = "600 20px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("Canchas de cristal indoor", card3X + modW / 2, modY + 220);

  // 5. CTA BUTTON CENTRAL
  const ctaW = 520;
  const ctaH = 74;
  const ctaX = centerX - ctaW / 2;
  const ctaY = modY + modH + 28;

  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 20);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, theme.brandGradient[1]);
  ctaGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = ctaGrad;
  ctx.fill();

  ctx.font = "900 26px 'Inter', sans-serif";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.fillText("INSCRIPCIONES ABIERTAS AHORA 🎾", centerX, ctaY + 47);
}

/**
 * LAYOUT 3: split_inverted (Invertido Vanguardia)
 * Logo: Superior Derecha -> EXACTAMENTE 35% DEL ANCHO (672 px x 262 px)
 * Tarjeta: Izquierda vertical completa
 */
function renderLayoutSplitInverted(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: FlyerRenderData,
  theme: ThemeConfig,
  logoImage?: HTMLImageElement | null
) {
  // 1. LOGO SUPERIOR DERECHA: 35% exacto de 1920px = 672px
  const logoW = 672;
  const logoH = 262;
  const logoX = W - 70 - logoW;
  const logoY = 40;

  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(245, 158, 11, 0.4)";
    ctx.shadowBlur = 20;
    drawImageProportional(ctx, logoImage, logoX, logoY, logoW, logoH, "right");
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, logoW, logoH, 20);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.font = "900 32px 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SALADILLO PADEL TOUR", logoX + logoW / 2, logoY + logoH / 2 + 10);
  }

  // Badge categoría debajo del logo alineado a la derecha
  const badgeText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 24px 'Inter', sans-serif";
  const catWidth = ctx.measureText(badgeText).width + 56;
  const badgeH = 56;
  const badgeX = W - 70 - catWidth;
  const badgeY = logoY + logoH + 20;

  roundRect(ctx, badgeX, badgeY, catWidth, badgeH, 28);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + catWidth / 2, badgeY + 36);

  // 2. TARJETA VERTICAL A LA IZQUIERDA - LLENA EL ESPACIO COMPLETO
  const cardX = 70;
  const cardY = 50;
  const cardW = 810;
  const cardH = 825;

  ctx.save();
  ctx.shadowColor = theme.cardGlow;
  ctx.shadowBlur = 40;
  roundRect(ctx, cardX, cardY, cardW, cardH, 30);
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.fill();
  ctx.restore();

  roundRect(ctx, cardX, cardY, cardW, cardH, 30);
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 3;
  ctx.stroke();

  roundRect(ctx, cardX, cardY, cardW, 85, 30);
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.fill();

  ctx.font = "900 28px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText("COORDENADAS DEL TORNEO", cardX + 50, cardY + 54);

  // Fila 1: FECHA
  const row1Y = cardY + 160;
  ctx.font = "800 20px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📅 FECHA DE DISPUTA", cardX + 50, row1Y);

  ctx.font = "900 38px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.date || "PRÓXIMAMENTE").toUpperCase(), cardX + 50, row1Y + 48, cardW - 100, 44, 2);

  // Fila 2: SEDE
  const row2Y = cardY + 310;
  ctx.font = "800 20px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📍 COMPLEJO SEDE", cardX + 50, row2Y);

  ctx.font = "900 36px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.location || "SALADILLO, BUENOS AIRES").toUpperCase(), cardX + 50, row2Y + 48, cardW - 100, 42, 2);

  // Fila 3: PREMIOS
  const row3Y = cardY + 475;
  const prizeBoxW = cardW - 100;
  const prizeBoxH = 220;

  roundRect(ctx, cardX + 50, row3Y, prizeBoxW, prizeBoxH, 24);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = "900 24px 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.fillText("🏆 PREMIOS Y RECONOCIMIENTOS", cardX + 80, row3Y + 52);

  ctx.font = "900 52px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.prizes || "TROFEOS + EFECTIVO").toUpperCase(), cardX + 80, row3Y + 128, prizeBoxW - 50, 54, 1);

  ctx.font = "600 20px 'Inter', sans-serif";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText("Suma puntos para el ranking oficial Saladillo", cardX + 80, row3Y + 175);

  // Footer tarjeta
  ctx.font = "bold 20px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "center";
  ctx.fillText("INSCRIPCIÓN ONLINE OFICIAL EN SPT-PADEL-TOUR.COM", cardX + cardW / 2, cardY + cardH - 40);

  // 3. TÍTULO Y CONTENIDO A LA DERECHA (ALINEADO A LA DERECHA)
  const rightX = W - 70;
  const titleY = badgeY + badgeH + 75;

  ctx.font = "900 84px 'Inter', sans-serif";
  const tGrad = ctx.createLinearGradient(rightX - 700, titleY, rightX, titleY + 160);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  wrapTextRight(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), rightX, titleY, 930, 92, 2);

  // Línea de acento a la derecha
  ctx.fillStyle = theme.accentColor;
  ctx.fillRect(rightX - 180, titleY + 110, 180, 8);

  // Subtítulo
  ctx.font = "600 28px 'Inter', sans-serif";
  ctx.fillStyle = "#f1f5f9";
  wrapTextRight(
    ctx,
    "Demostrá tu nivel en la pista más competitiva. Cupos limitados por estricto orden de inscripción.",
    rightX,
    titleY + 160,
    930,
    42,
    2
  );

  // CTA Button (Alineado a la derecha)
  const ctaW = 460;
  const ctaH = 78;
  const ctaX = rightX - ctaW;
  const ctaY = 790;

  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 20);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, theme.brandGradient[1]);
  ctaGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = ctaGrad;
  ctx.fill();

  ctx.font = "900 26px 'Inter', sans-serif";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.fillText("¡ANOTATE CON TU PAREJA! ⚡", ctaX + ctaW / 2, ctaY + 48);
}

/**
 * LAYOUT 4: magazine_bold (Editorial Deportivo)
 * Logo: Superior Panorámico -> EXACTAMENTE 35% DEL ANCHO (672 px x 210 px)
 * Bloques simétricos ampliados cubriendo todo el espacio
 */
function renderLayoutMagazineBold(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: FlyerRenderData,
  theme: ThemeConfig,
  logoImage?: HTMLImageElement | null
) {
  // 1. CINTA SUPERIOR PANORÁMICA DE CABECERA
  const bannerY = 40;
  const bannerH = 175;
  roundRect(ctx, 70, bannerY, W - 140, bannerH, 24);
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Badge categoría en la cinta (Izquierda)
  const catText = (data.category || "CATEGORÍA ABIERTA").toUpperCase();
  ctx.font = "900 28px 'Inter', sans-serif";
  const catW = ctx.measureText(catText).width + 68;
  const catX = 120;
  roundRect(ctx, catX, bannerY + 54, catW, 68, 34);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(catText, catX + catW / 2, bannerY + 97);

  // 2. LOGO EN LA CINTA A LA DERECHA: 35% exacto de 1920px = 672px
  const logoW = 672;
  const logoH = 155;
  const logoX = W - 100 - logoW;
  const logoY = bannerY + 10;

  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(245, 158, 11, 0.4)";
    ctx.shadowBlur = 18;
    drawImageProportional(ctx, logoImage, logoX, logoY, logoW, logoH, "right");
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, logoW, logoH, 16);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.font = "900 30px 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SALADILLO PADEL TOUR", logoX + logoW / 2, logoY + logoH / 2 + 10);
  }

  // 3. TITULAR EDITORIAL MASIVO
  const titleY = bannerY + bannerH + 90;
  ctx.font = "900 86px 'Inter', sans-serif";
  ctx.textAlign = "left";

  const tGrad = ctx.createLinearGradient(70, titleY, 1300, titleY + 120);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.6, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  wrapText(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), 70, titleY, 1780, 92, 1);

  // 4. MÓDULOS DE CONTENIDO - OCUPAN TODO EL ESPACIO HASTA EL FOOTER
  const modY = titleY + 45;
  const colW = 560;
  const colH = 260;

  // Módulo A: FECHA (Izquierda)
  roundRect(ctx, 70, modY, colW, colH, 24);
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = "900 22px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "left";
  ctx.fillText("📅 FECHA DE JUEGO", 110, modY + 52);

  ctx.font = "900 36px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.date || "PRÓXIMO FIN DE SEMANA").toUpperCase(), 110, modY + 115, colW - 80, 42, 2);

  ctx.font = "600 18px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Fase de grupos + Playoffs eliminatorios", 110, modY + 215);

  // Módulo B: SEDE (Centro)
  const col2X = 70 + colW + 30;
  roundRect(ctx, col2X, modY, colW, colH, 24);
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = "900 22px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📍 COMPLEJO OFICIAL", col2X + 40, modY + 52);

  ctx.font = "900 34px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, (data.location || "COMPLEJO CENTRAL SALADILLO").toUpperCase(), col2X + 40, modY + 115, colW - 80, 40, 2);

  ctx.font = "600 18px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Vestuarios, bar y vista panorámica", col2X + 40, modY + 215);

  // Módulo C: PREMIOS + CTA (Derecha)
  const col3X = col2X + colW + 30;
  const col3W = W - col3X - 70;

  roundRect(ctx, col3X, modY, col3W, colH + 215, 26);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.font = "900 24px 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText("🏆 PREMIOS PRINCIPALES", col3X + col3W / 2, modY + 55);

  ctx.font = "900 52px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapTextCentered(ctx, (data.prizes || "PREMIOS EN EFECTIVO").toUpperCase(), col3X + col3W / 2, modY + 130, col3W - 40, 52, 2);

  ctx.font = "700 22px 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.fillText("+ Trofeos para Campeones y Finalistas", col3X + col3W / 2, modY + 245);

  ctx.font = "600 19px 'Inter', sans-serif";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText("Indumentaria técnica oficial", col3X + col3W / 2, modY + 285);

  // CTA integrado en tarjeta derecha
  const ctaH = 74;
  const ctaW = col3W - 70;
  const ctaX = col3X + 35;
  const ctaY = modY + 340;

  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 18);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, theme.brandGradient[1]);
  ctaGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = ctaGrad;
  ctx.fill();

  ctx.font = "900 24px 'Inter', sans-serif";
  ctx.fillStyle = "#000000";
  ctx.fillText("RESERVAR LUGAR AHORA ⚡", col3X + col3W / 2, ctaY + 46);

  // Frase publicitaria izquierda abajo
  const bottomBoxX = 70;
  const bottomBoxY = modY + colH + 25;
  const bottomBoxW = colW * 2 + 30;
  const bottomBoxH = 190;

  roundRect(ctx, bottomBoxX, bottomBoxY, bottomBoxW, bottomBoxH, 22);
  ctx.fillStyle = "rgba(10, 15, 29, 0.7)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 24px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "left";
  ctx.fillText("⭐ COMPETICIÓN DE MÁXIMO NIVEL", bottomBoxX + 40, bottomBoxY + 52);

  ctx.font = "600 22px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  wrapText(
    ctx,
    "Todos los partidos cuentan para el Ranking General Anual. Transmisión de finales en vivo y cobertura fotográfica profesional de cada encuentro.",
    bottomBoxX + 40,
    bottomBoxY + 100,
    bottomBoxW - 80,
    36,
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

  // 2. FONDO PRINCIPAL (MUCHO MÁS CLARO Y NÍTIDO)
  if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
    const scale = Math.max(W / bgImage.naturalWidth, H / bgImage.naturalHeight);
    const sw = bgImage.naturalWidth * scale;
    const sh = bgImage.naturalHeight * scale;
    const sx = (W - sw) / 2;
    const sy = (H - sh) / 2;

    ctx.drawImage(bgImage, sx, sy, sw, sh);

    // Velo ultra-suave y transparente: la imagen de fondo se ve mucho más clara y brillante
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "rgba(4, 9, 20, 0.18)");
    grad.addColorStop(0.5, "rgba(4, 9, 20, 0.10)");
    grad.addColorStop(1, "rgba(4, 9, 20, 0.24)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else {
    // Gradiente de fallback claro
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(0.5, "#1e293b");
    grad.addColorStop(1, "#0f172a");
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
