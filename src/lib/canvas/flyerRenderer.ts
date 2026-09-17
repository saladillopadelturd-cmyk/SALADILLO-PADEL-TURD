/**
 * SPT (Saladillo Padel Tour) - Canvas Flyer Compositor
 * Renderiza composiciones vectoriales en formato HORIZONTAL (1920x1080 px - 16:9)
 * Soporta múltiples variaciones de diseño, paletas y distribución para regeneración visual única:
 * - split_card: Logo sup-izq, título masivo a la izquierda, tarjeta vertical lateral derecha.
 * - hero_center: Logo sup-centro con halo dorado, título centrado, 3 módulos podio y CTA central.
 * - split_inverted: Logo sup-der, tarjeta vertical a la izquierda, título y CTA alineados a derecha.
 * - magazine_bold: Logo en cabecera panorámica, titular masivo y módulos gemelos equilibrados.
 *
 * NOTA DE DISEÑO: Preserva SIEMPRE la proporción de aspecto original (1:1 o nativa) del logo
 * Saladillo Padel Tour, evitando cualquier deformación o estiramiento.
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
    description: "Logo superior izquierda, títulos a la izquierda y tarjeta vertical lateral",
    logoPosition: "Superior Izquierda",
  },
  hero_center: {
    name: "Impacto Central",
    description: "Logo central con halo dorado, títulos centrados y 3 tarjetas horizontales podio",
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
    logoPosition: "Flotante Superior Derecha",
  },
};

export const THEMES: Record<FlyerTheme, ThemeConfig> = {
  neon_emerald: {
    name: "Verde Neón Oficial",
    badgeBg: "rgba(34, 197, 94, 0.15)",
    badgeBorder: "rgba(34, 197, 94, 0.5)",
    badgeText: "#4ade80",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#4ade80", "#22c55e"],
    accentColor: "#22c55e",
    cardBorder: "rgba(34, 197, 94, 0.4)",
    cardGlow: "rgba(34, 197, 94, 0.18)",
    footerBg: "rgba(5, 15, 10, 0.95)",
  },
  gold_luxury: {
    name: "Oro & Platino Master",
    badgeBg: "rgba(245, 158, 11, 0.18)",
    badgeBorder: "rgba(245, 158, 11, 0.6)",
    badgeText: "#fbbf24",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#fde047", "#eab308"],
    accentColor: "#eab308",
    cardBorder: "rgba(245, 158, 11, 0.45)",
    cardGlow: "rgba(245, 158, 11, 0.22)",
    footerBg: "rgba(15, 12, 5, 0.95)",
  },
  cyan_glacier: {
    name: "Azul Eléctrico Pista",
    badgeBg: "rgba(6, 182, 212, 0.18)",
    badgeBorder: "rgba(6, 182, 212, 0.5)",
    badgeText: "#67e8f9",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#38bdf8", "#0284c7"],
    accentColor: "#06b6d4",
    cardBorder: "rgba(6, 182, 212, 0.45)",
    cardGlow: "rgba(6, 182, 212, 0.2)",
    footerBg: "rgba(4, 12, 20, 0.95)",
  },
  fire_sunset: {
    name: "Fuego & Competencia",
    badgeBg: "rgba(239, 68, 68, 0.18)",
    badgeBorder: "rgba(239, 68, 68, 0.5)",
    badgeText: "#f87171",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#fb923c", "#ef4444"],
    accentColor: "#ef4444",
    cardBorder: "rgba(239, 68, 68, 0.45)",
    cardGlow: "rgba(239, 68, 68, 0.2)",
    footerBg: "rgba(18, 5, 5, 0.95)",
  },
  cyber_violet: {
    name: "Cyber Violeta Pro",
    badgeBg: "rgba(168, 85, 247, 0.18)",
    badgeBorder: "rgba(168, 85, 247, 0.5)",
    badgeText: "#c084fc",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#e879f9", "#a855f7"],
    accentColor: "#a855f7",
    cardBorder: "rgba(168, 85, 247, 0.45)",
    cardGlow: "rgba(168, 85, 247, 0.22)",
    footerBg: "rgba(12, 4, 20, 0.95)",
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
 * estricta de su aspecto original (aspect ratio), centrada dentro del box delimitador.
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

// Helpers de ajuste de texto
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
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
  lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), centerX, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
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
  lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), rightX, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
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

  // Etiqueta SPONSORS OFICIALES
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
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
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
 * Logo: Superior Izquierda (Proporción exacta 1:1, nunca deformado)
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
  // 1. LOGO SPT SUPERIOR IZQUIERDA
  // Contenedor cuadrado para proporción 1:1 perfecta (sin deformación)
  const logoBoxSize = 96;
  const logoX = 100;
  const logoY = 55;

  let actualDrawnW = logoBoxSize;
  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(245, 158, 11, 0.45)";
    ctx.shadowBlur = 18;
    const drawn = drawImageProportional(
      ctx,
      logoImage,
      logoX,
      logoY,
      logoBoxSize,
      logoBoxSize,
      "left"
    );
    actualDrawnW = drawn.width;
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, logoBoxSize, logoBoxSize, 16);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "900 24px 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SPT", logoX + logoBoxSize / 2, logoY + 56);
  }

  // Badge categoría al lado del logo
  const badgeX = logoX + actualDrawnW + 24;
  const badgeY = logoY + 22;
  const badgeText = data.category ? data.category.toUpperCase() : "TORNEO OFICIAL";
  ctx.font = "900 18px 'Inter', sans-serif";
  const catWidth = ctx.measureText(badgeText).width + 36;
  const badgeH = 50;

  roundRect(ctx, badgeX, badgeY, catWidth, badgeH, 25);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + catWidth / 2, badgeY + 32);

  // Sub-badge Saladillo Padel Tour
  ctx.font = "bold 14px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "left";
  ctx.fillText("CIRCUITO SALADILLO PÁDEL TOUR 2026", 100, 195);

  // 2. TÍTULO PRINCIPAL (COLUMNA IZQUIERDA)
  const titleY = 280;
  ctx.font = "900 78px 'Inter', sans-serif";
  ctx.textAlign = "left";

  const tGrad = ctx.createLinearGradient(100, titleY, 800, titleY + 160);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  wrapText(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), 100, titleY, 900, 88);

  // Línea de acento decorativa
  ctx.fillStyle = theme.accentColor;
  ctx.fillRect(100, 520, 140, 6);

  // Subtítulo / Bajada informativa
  ctx.font = "600 24px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  wrapText(
    ctx,
    "¡Viví la emoción del mejor pádel de la provincia! Inscripciones abiertas para todas las parejas.",
    100,
    570,
    880,
    38
  );

  // CTA Button (Izquierda)
  const ctaW = 380;
  const ctaH = 68;
  const ctaX = 100;
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
  const cardX = 1120;
  const cardY = 120;
  const cardW = 700;
  const cardH = 750;

  ctx.save();
  ctx.shadowColor = theme.cardGlow;
  ctx.shadowBlur = 40;
  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fillStyle = "rgba(10, 15, 29, 0.88)";
  ctx.fill();
  ctx.restore();

  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  roundRect(ctx, cardX, cardY, cardW, 80, 28);
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
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
  ctx.fillText(data.date || "PRÓXIMAMENTE", cardX + 45, row1Y + 42);

  // Fila 2: SEDE
  const row2Y = cardY + 280;
  ctx.font = "700 16px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📍 COMPLEJO & UBICACIÓN", cardX + 45, row2Y);

  ctx.font = "800 30px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, data.location || "SALADILLO, BUENOS AIRES", cardX + 45, row2Y + 42, 600, 38);

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
  ctx.fillText("🏆 BOLSA DE PREMIOS OFICIAL", cardX + 75, row3Y + 45);

  ctx.font = "900 48px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(data.prizes || "TROFEOS + EFECTIVO", cardX + 75, row3Y + 115);

  ctx.font = "600 18px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Indumentaria pro + Puntos para el ranking anual SPT", cardX + 75, row3Y + 155);

  // Fila 4: Footer de tarjeta
  ctx.font = "bold 18px 'Inter', sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "center";
  ctx.fillText("INSCRIPCIÓN ONLINE VÍA SPT-PADEL-TOUR.COM", cardX + cardW / 2, cardY + cardH - 35);
}

/**
 * LAYOUT 2: hero_center (Impacto Central)
 * Logo: Centro Superior (X=960) con proporción intacta 1:1 y halo dorado
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
  const haloGrad = ctx.createRadialGradient(centerX, 115, 10, centerX, 115, 240);
  haloGrad.addColorStop(0, theme.cardGlow);
  haloGrad.addColorStop(1, "transparent");
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(centerX, 115, 240, 0, Math.PI * 2);
  ctx.fill();

  // 2. LOGO SPT CENTRO SUPERIOR (Proporción nativa 1:1, nunca estirado)
  const logoBoxSize = 110;
  const logoX = centerX - logoBoxSize / 2;
  const logoY = 48;

  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(245, 158, 11, 0.6)";
    ctx.shadowBlur = 24;
    drawImageProportional(
      ctx,
      logoImage,
      logoX,
      logoY,
      logoBoxSize,
      logoBoxSize,
      "center"
    );
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, logoBoxSize, logoBoxSize, 20);
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.font = "900 28px 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SPT", centerX, logoY + 65);
  }

  // Pill de Categoría justo abajo del logo
  const catText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 18px 'Inter', sans-serif";
  const catW = ctx.measureText(catText).width + 48;
  const catY = 175;
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
  ctx.font = "900 76px 'Inter', sans-serif";
  ctx.textAlign = "center";

  const tGrad = ctx.createLinearGradient(centerX - 400, titleY, centerX + 400, titleY + 80);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  wrapTextCentered(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), centerX, titleY, 1400, 84);

  // Subtítulo central
  ctx.font = "600 24px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.textAlign = "center";
  ctx.fillText("CIRCUITO PROFESIONAL & AMATEUR • SALADILLO PÁDEL TOUR 2026", centerX, 440);

  // 4. TRES TARJETAS HORIZONTALES (PODIO)
  const modY = 485;
  const modH = 260;
  const gap = 30;
  const totalW = 1620;
  const modW = (totalW - gap * 2) / 3;
  const startX = (W - totalW) / 2;

  // Tarjeta 1: FECHA
  const card1X = startX;
  roundRect(ctx, card1X, modY, modW, modH, 24);
  ctx.fillStyle = "rgba(10, 15, 29, 0.85)";
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "900 20px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "center";
  ctx.fillText("📅 CRONOGRAMA", card1X + modW / 2, modY + 50);

  ctx.font = "900 36px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapTextCentered(ctx, data.date || "PRÓXIMAMENTE", card1X + modW / 2, modY + 115, modW - 40, 42);

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

  ctx.font = "900 46px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapTextCentered(ctx, data.prizes || "$500.000 EN EFECTIVO", card2X + modW / 2, modY + 115, modW - 40, 48);

  ctx.font = "700 18px 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.fillText("+ Palas Pro + Puntos SPT", card2X + modW / 2, modY + 225);

  // Tarjeta 3: SEDE
  const card3X = startX + (modW + gap) * 2;
  roundRect(ctx, card3X, modY, modW, modH, 24);
  ctx.fillStyle = "rgba(10, 15, 29, 0.85)";
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "900 20px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "center";
  ctx.fillText("📍 SEDE & CLUB", card3X + modW / 2, modY + 50);

  ctx.font = "900 32px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapTextCentered(ctx, data.location || "COMPLEJO CENTRAL", card3X + modW / 2, modY + 115, modW - 40, 38);

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
 * Logo: Superior Derecha (Proporción exacta 1:1, sin deformación)
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
  // 1. LOGO SUPERIOR DERECHA (Caja cuadrada 1:1)
  const logoBoxSize = 96;
  const logoX = W - 100 - logoBoxSize;
  const logoY = 55;

  let actualDrawnW = logoBoxSize;
  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(245, 158, 11, 0.45)";
    ctx.shadowBlur = 18;
    const drawn = drawImageProportional(
      ctx,
      logoImage,
      logoX,
      logoY,
      logoBoxSize,
      logoBoxSize,
      "right"
    );
    actualDrawnW = drawn.width;
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, logoBoxSize, logoBoxSize, 16);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "900 24px 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SPT", logoX + logoBoxSize / 2, logoY + 56);
  }

  // Badge categoría al lado izquierdo del logo
  const badgeText = data.category ? data.category.toUpperCase() : "TORNEO OFICIAL";
  ctx.font = "900 18px 'Inter', sans-serif";
  const catWidth = ctx.measureText(badgeText).width + 36;
  const badgeX = logoX - catWidth - 24;
  const badgeY = logoY + 22;

  roundRect(ctx, badgeX, badgeY, catWidth, 50, 25);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + catWidth / 2, badgeY + 32);

  // 2. TARJETA VERTICAL A LA IZQUIERDA
  const cardX = 100;
  const cardY = 120;
  const cardW = 720;
  const cardH = 750;

  ctx.save();
  ctx.shadowColor = theme.cardGlow;
  ctx.shadowBlur = 40;
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
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
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
  ctx.fillText(data.date || "PRÓXIMAMENTE", cardX + 45, row1Y + 42);

  // Fila 2: SEDE
  const row2Y = cardY + 280;
  ctx.font = "700 16px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📍 COMPLEJO SEDE", cardX + 45, row2Y);

  ctx.font = "800 30px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, data.location || "SALADILLO, BUENOS AIRES", cardX + 45, row2Y + 42, 620, 38);

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
  ctx.fillText("🏆 PREMIOS Y RECONOCIMIENTO", cardX + 75, row3Y + 45);

  ctx.font = "900 48px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(data.prizes || "TROFEOS + EFECTIVO", cardX + 75, row3Y + 115);

  ctx.font = "600 18px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Suma puntos para el Master Final Saladillo", cardX + 75, row3Y + 155);

  // Footer tarjeta
  ctx.font = "bold 18px 'Inter', sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "center";
  ctx.fillText("INSCRIPCIONES ABIERTAS EN LA APP OFICIAL", cardX + cardW / 2, cardY + cardH - 35);

  // 3. TÍTULO Y CONTENIDO A LA DERECHA (ALINEADO A LA DERECHA)
  const rightX = W - 100;
  const titleY = 280;

  ctx.font = "bold 16px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "right";
  ctx.fillText("CIRCUITO SALADILLO PÁDEL TOUR 2026", rightX, 220);

  ctx.font = "900 78px 'Inter', sans-serif";
  const tGrad = ctx.createLinearGradient(rightX - 700, titleY, rightX, titleY + 160);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  wrapTextRight(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), rightX, titleY, 900, 88);

  // Línea de acento a la derecha
  ctx.fillStyle = theme.accentColor;
  ctx.fillRect(rightX - 140, 520, 140, 6);

  // Subtítulo
  ctx.font = "600 24px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  wrapTextRight(
    ctx,
    "Demostrá tu nivel en la pista más competitiva. Cupos estrictamente limitados por orden de inscripción.",
    rightX,
    570,
    880,
    38
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
 * Logo: En cabecera panorámica (proporción 1:1 exacta, sin estiramiento)
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
  const bannerY = 50;
  const bannerH = 68;
  roundRect(ctx, 80, bannerY, W - 160, bannerH, 16);
  ctx.fillStyle = "rgba(10, 15, 29, 0.85)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Texto cinta
  ctx.font = "bold 16px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "left";
  ctx.fillText("CIRCUITO OFICIAL • SALADILLO PÁDEL TOUR", 120, bannerY + 42);

  // Badge categoría en la cinta
  const catText = (data.category || "CATEGORÍA ABIERTA").toUpperCase();
  ctx.font = "900 18px 'Inter', sans-serif";
  const catW = ctx.measureText(catText).width + 36;
  const catX = 580;
  roundRect(ctx, catX, bannerY + 11, catW, 46, 23);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(catText, catX + catW / 2, bannerY + 39);

  // 2. LOGO EN LA CINTA A LA DERECHA (Proporción nativa 1:1, nunca estirado)
  const logoBoxSize = 58;
  const logoX = W - 120 - logoBoxSize;
  const logoY = bannerY + 5;

  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(245, 158, 11, 0.45)";
    ctx.shadowBlur = 12;
    drawImageProportional(
      ctx,
      logoImage,
      logoX,
      logoY,
      logoBoxSize,
      logoBoxSize,
      "center"
    );
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, logoBoxSize, logoBoxSize, 10);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "900 20px 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SPT", logoX + logoBoxSize / 2, logoY + 38);
  }

  // 3. TITULAR EDITORIAL MASIVO
  const titleY = 220;
  ctx.font = "900 86px 'Inter', sans-serif";
  ctx.textAlign = "left";

  const tGrad = ctx.createLinearGradient(80, titleY, 1200, titleY + 120);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.6, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  wrapText(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), 80, titleY, 1760, 92);

  // 4. MÓDULOS DE CONTENIDO
  // Módulo A: FECHA (Izquierda)
  const modY = 430;
  const colW = 550;
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

  ctx.font = "900 36px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, data.date || "PRÓXIMO FIN DE SEMANA", 115, modY + 105, colW - 70, 42);

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

  ctx.font = "900 34px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, data.location || "COMPLEJO CENTRAL SALADILLO", col2X + 35, modY + 105, colW - 70, 40);

  ctx.font = "600 16px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Vestuarios, bar y tribuna con vista panorámica", col2X + 35, modY + 185);

  // Módulo C: PREMIOS + CTA (Derecha, ancho destacado)
  const col3X = col2X + colW + 30;
  const col3W = W - col3X - 80;

  roundRect(ctx, col3X, modY, col3W, colH + 220, 24);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = "900 22px 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText("🏆 PREMIOS PRINCIPALES", col3X + col3W / 2, modY + 55);

  ctx.font = "900 52px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapTextCentered(ctx, data.prizes || "PREMIOS EN EFECTIVO", col3X + col3W / 2, modY + 130, col3W - 40, 52);

  ctx.font = "700 20px 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.fillText("+ Trofeos para Campeones y Finalistas", col3X + col3W / 2, modY + 250);

  ctx.font = "600 18px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("Indumentaria técnica oficial SPT", col3X + col3W / 2, modY + 290);

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
  const bottomBoxH = 195;

  roundRect(ctx, bottomBoxX, bottomBoxY, bottomBoxW, bottomBoxH, 20);
  ctx.fillStyle = "rgba(10, 15, 29, 0.7)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 22px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "left";
  ctx.fillText("⭐ COMPETICIÓN DE MÁXIMO NIVEL EN SALADILLO", bottomBoxX + 35, bottomBoxY + 50);

  ctx.font = "600 20px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  wrapText(
    ctx,
    "Todos los partidos cuentan para el Ranking General Anual. Transmisión de finales en vivo y cobertura fotográfica profesional de cada encuentro.",
    bottomBoxX + 35,
    bottomBoxY + 95,
    bottomBoxW - 70,
    32
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

  // 2. FONDO PRINCIPAL
  if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
    const scale = Math.max(W / bgImage.naturalWidth, H / bgImage.naturalHeight);
    const sw = bgImage.naturalWidth * scale;
    const sh = bgImage.naturalHeight * scale;
    const sx = (W - sw) / 2;
    const sy = (H - sh) / 2;

    ctx.drawImage(bgImage, sx, sy, sw, sh);

    // Overlays para contraste cinematográfico
    ctx.fillStyle = "rgba(6, 11, 25, 0.65)";
    ctx.fillRect(0, 0, W, H);

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "rgba(2, 6, 23, 0.85)");
    grad.addColorStop(0.5, "rgba(2, 6, 23, 0.5)");
    grad.addColorStop(1, "rgba(2, 6, 23, 0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else {
    // Gradiente de fallback
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#020617");
    grad.addColorStop(0.5, "#0f172a");
    grad.addColorStop(1, "#020617");
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
