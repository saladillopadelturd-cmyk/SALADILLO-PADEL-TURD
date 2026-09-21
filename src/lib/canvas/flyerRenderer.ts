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
    name: "Verde Padel Neón",
    badgeBg: "rgba(16, 185, 129, 0.28)",
    badgeBorder: "rgba(52, 211, 153, 0.95)",
    badgeText: "#34d399",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#6ee7b7", "#10b981"],
    accentColor: "#10b981",
    cardBorder: "rgba(52, 211, 153, 0.65)",
    cardGlow: "rgba(16, 185, 129, 0.35)",
    footerBg: "rgba(4, 15, 10, 0.96)",
  },
  gold_luxury: {
    name: "Oro Imperial & Master",
    badgeBg: "rgba(245, 158, 11, 0.28)",
    badgeBorder: "rgba(251, 191, 36, 0.95)",
    badgeText: "#fde047",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#fde047", "#f59e0b"],
    accentColor: "#f59e0b",
    cardBorder: "rgba(251, 191, 36, 0.70)",
    cardGlow: "rgba(245, 158, 11, 0.38)",
    footerBg: "rgba(16, 11, 4, 0.96)",
  },
  cyan_glacier: {
    name: "Azul Eléctrico Pista",
    badgeBg: "rgba(6, 182, 212, 0.28)",
    badgeBorder: "rgba(56, 189, 248, 0.95)",
    badgeText: "#38bdf8",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#7dd3fc", "#0284c7"],
    accentColor: "#06b6d4",
    cardBorder: "rgba(56, 189, 248, 0.68)",
    cardGlow: "rgba(6, 182, 212, 0.35)",
    footerBg: "rgba(4, 12, 22, 0.96)",
  },
  fire_sunset: {
    name: "Fuego & Competencia",
    badgeBg: "rgba(239, 68, 68, 0.28)",
    badgeBorder: "rgba(251, 146, 60, 0.95)",
    badgeText: "#fb923c",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#fdba74", "#f97316"],
    accentColor: "#f97316",
    cardBorder: "rgba(251, 146, 60, 0.70)",
    cardGlow: "rgba(249, 115, 22, 0.38)",
    footerBg: "rgba(18, 5, 5, 0.96)",
  },
  cyber_violet: {
    name: "Cyber Violeta Padel",
    badgeBg: "rgba(168, 85, 247, 0.28)",
    badgeBorder: "rgba(216, 180, 254, 0.95)",
    badgeText: "#d8b4fe",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#f0abfc", "#c084fc"],
    accentColor: "#c084fc",
    cardBorder: "rgba(216, 180, 254, 0.68)",
    cardGlow: "rgba(168, 85, 247, 0.35)",
    footerBg: "rgba(14, 5, 22, 0.96)",
  },
};

// Helper de dibujo de rectángulo redondeado
/**
 * Helper para aplicar sombra de desenfoque negra ultra profunda a objetos, textos y tarjetas
 * Sombra multicapa o con desenfoque extremo para máxima separación dimensional del fondo.
 */
function setBlackShadow(
  ctx: CanvasRenderingContext2D,
  blur = 65,
  offsetY = 18,
  alpha = 0.98
) {
  ctx.shadowColor = `rgba(0, 0, 0, ${alpha})`;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = offsetY;
}

/**
 * Limpia cualquier sombra activa en el contexto de dibujo
 */
function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

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
 * Dibuja un contenedor o tarjeta con sombra negra multi-capa super profunda y acento visual deportivo
 */
function drawElevatedCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  bgColor = "rgba(10, 15, 29, 0.92)",
  borderColor = "rgba(255, 255, 255, 0.15)",
  borderWidth = 2.5
) {
  ctx.save();
  // Primera pasada: sombra de ambient occlusion amplia y desenfocada
  setBlackShadow(ctx, 75, 20, 0.98);
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = bgColor;
  ctx.fill();
  // Segunda pasada: sombra focal nítida
  setBlackShadow(ctx, 35, 10, 0.95);
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();

  // Borde nítido con color de acento
  if (borderColor && borderWidth > 0) {
    roundRect(ctx, x, y, w, h, r);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.stroke();
  }
}

/**
 * Dibuja detalles geométricos deportivos (esquinas tech, puntos de pista, micro-líneas de acento)
 */
function drawSportTechDecorations(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  accentColor: string
) {
  ctx.save();
  clearShadow(ctx);

  // Esquina superior derecha: micro-marcador geométrico
  ctx.fillStyle = accentColor;
  ctx.fillRect(x + w - 30, y + 15, 14, 3);
  ctx.fillRect(x + w - 19, y + 15, 3, 14);

  // Esquina inferior izquierda: corchete deportivo
  ctx.fillRect(x + 15, y + h - 18, 14, 3);
  ctx.fillRect(x + 15, y + h - 29, 3, 14);

  // Tres puntos técnicos de estado
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + 35 + i * 14, y + 25, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? accentColor : "rgba(255, 255, 255, 0.35)";
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Dibuja una imagen en el canvas garantizando SIEMPRE la preservación
 * estricta de su aspecto original (aspect ratio), dentro del box delimitador.
 * NUNCA deforma ni estira el logotipo.
 * Aplica sombra negra de desenfoque extrema para otorgarle protagonismo estelar.
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

  ctx.save();
  // Sombra negra ultra potente y extendida para despegar el logo del fondo
  setBlackShadow(ctx, 80, 20, 0.99);
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  setBlackShadow(ctx, 45, 10, 0.95);
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
  return { x: drawX, y: drawY, width: drawW, height: drawH };
}

/**
 * Renderiza un título garantizando que quede 100% dentro de los límites.
 * Si el texto es largo, escala progresivamente el tamaño de fuente hacia abajo
 * para evitar cualquier desborde o corte.
 */
function renderBoundedTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxLines = 2,
  preferredFontSize = 84,
  minFontSize = 52,
  align: "left" | "center" | "right" = "left"
): { endY: number; usedFontSize: number } {
  const words = text.trim().split(/\s+/);
  let fontSize = preferredFontSize;
  let lines: string[] = [];

  // Reducción adaptativa de fuente si el texto completo no encaja en maxLines
  while (fontSize >= minFontSize) {
    ctx.font = `900 ${fontSize}px 'Montserrat', 'Inter', sans-serif`;
    lines = [];
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? currentLine + " " + words[i] : words[i];
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    if (lines.length <= maxLines) {
      // Verifica que cada palabra individual no exceda maxWidth
      const anyOverflow = lines.some((l) => ctx.measureText(l).width > maxWidth);
      if (!anyOverflow) break;
    }
    fontSize -= 4;
  }

  // Fallback si aún excede maxLines
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + "...").width > maxWidth && last.length > 0) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = last.trim() + "...";
  }

  const lineHeight = Math.round(fontSize * 1.14);
  let currentY = y;

  ctx.save();
  // Sombra negra ultra potente y definida para el titular
  setBlackShadow(ctx, 35, 8, 0.99);

  for (let idx = 0; idx < lines.length; idx++) {
    const lineText = lines[idx];
    if (align === "center") {
      ctx.textAlign = "center";
      ctx.fillText(lineText, x, currentY);
    } else if (align === "right") {
      ctx.textAlign = "right";
      ctx.fillText(lineText, x, currentY);
    } else {
      ctx.textAlign = "left";
      ctx.fillText(lineText, x, currentY);
    }
    if (idx < lines.length - 1) {
      currentY += lineHeight;
    }
  }
  ctx.restore();

  return { endY: currentY, usedFontSize: fontSize };
}

/**
 * Ajusta y renderiza texto multilínea garantizando que NUNCA desborde maxWidth
 * ni exceda maxLines (si se especifica). Con soporte de sombra oscura.
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

/**
 * LAYOUT 1: split_card (Clásico Asimétrico)
 * Logo: Superior Izquierda -> EXACTAMENTE 35% DEL ANCHO (672 px x 262 px)
 * Solo 5 datos: nombre+categoría, fecha, lugar, premios. Sin texto adicional.
 */
function renderLayoutSplitCard(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: FlyerRenderData,
  theme: ThemeConfig,
  logoImage?: HTMLImageElement | null
) {
  const pad = 70;

  // ── LOGO SUPERIOR IZQUIERDA ──
  const logoW = 672;
  const logoH = 262;
  if (logoImage) drawImageProportional(ctx, logoImage, pad, pad, logoW, logoH, "left");

  // ── CATEGORÍA (badge) justo bajo el logo ──
  const badgeText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 34px 'Montserrat', 'Inter', sans-serif";
  const badgeW = Math.min(ctx.measureText(badgeText).width + 72, 580);
  const badgeH = 70;
  const badgeX = pad;
  const badgeY = pad + logoH + 22;
  ctx.save();
  setBlackShadow(ctx, 35, 10, 0.95);
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 35);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 35);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
  ctx.textBaseline = "alphabetic";

  // ── TÍTULO PRINCIPAL (nombre del torneo) gigante a la izquierda ──
  const titleY = badgeY + badgeH + 44;
  const titleMaxW = 920;
  const tGrad = ctx.createLinearGradient(pad, titleY, pad + titleMaxW, titleY + 160);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;
  renderBoundedTitle(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), pad, titleY, titleMaxW, 3, 120, 72, "left");
  const titleBottom = titleY + 160;

  // ── TARJETA VERTICAL DERECHA con 3 filas (fecha, lugar, premios) ──
  const cardX = 1080;
  const cardW = 770;
  const bandH = 240;
  const bandGap = 22;
  const cardTop = pad;
  const cardY = cardTop;
  const cardH = bandH * 3 + bandGap * 2 + 20;

  function drawInfoBand(bandY: number, label: string, value: string, accentColor: string) {
    ctx.save();
    setBlackShadow(ctx, 50, 14, 0.96);
    roundRect(ctx, cardX, bandY, cardW, bandH, 28);
    ctx.fillStyle = "rgba(6, 12, 26, 0.88)";
    ctx.fill();
    ctx.restore();

    roundRect(ctx, cardX, bandY, cardW, bandH, 28);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Etiqueta de sección (pequeña, arriba-izq)
    ctx.font = "700 22px 'Inter', sans-serif";
    ctx.fillStyle = accentColor;
    ctx.textAlign = "left";
    ctx.fillText(label, cardX + 44, bandY + 48);

    // Valor gigante
    ctx.font = "900 64px 'Montserrat', 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.save();
    setBlackShadow(ctx, 22, 6, 0.98);
    wrapText(ctx, value.toUpperCase(), cardX + 44, bandY + 110, cardW - 88, 72, 2);
    ctx.restore();
  }

  drawInfoBand(cardY, "📅  FECHA", data.date || "PRÓXIMAMENTE", theme.accentColor);
  drawInfoBand(cardY + bandH + bandGap, "📍  LUGAR", data.location || "SALADILLO, B.A.", theme.badgeText);
  drawInfoBand(cardY + (bandH + bandGap) * 2, "🏆  PREMIOS", data.prizes || "TROFEOS + EFECTIVO", "#fbbf24");
}

/**
 * LAYOUT 2: hero_center (Impacto Central)
 * Logo: Centro Superior -> EXACTAMENTE 35% DEL ANCHO (672 px x 262 px)
 * Todo centrado: solo 5 datos en tipografía masiva, fondo visible.
 */
function renderLayoutHeroCenter(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: FlyerRenderData,
  theme: ThemeConfig,
  logoImage?: HTMLImageElement | null
) {
  const cx = W / 2;

  // ── LOGO CENTRAL SUPERIOR (35%) ──
  const logoW = 672;
  const logoH = 262;
  if (logoImage) drawImageProportional(ctx, logoImage, cx - logoW / 2, 30, logoW, logoH, "center");

  // ── CATEGORÍA badge centrado bajo logo ──
  const catText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 36px 'Montserrat', 'Inter', sans-serif";
  const catW = Math.min(ctx.measureText(catText).width + 80, 800);
  const catY = logoH + 55;
  ctx.save();
  setBlackShadow(ctx, 40, 10, 0.95);
  roundRect(ctx, cx - catW / 2, catY, catW, 72, 36);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, cx - catW / 2, catY, catW, 72, 36);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(catText, cx, catY + 72 / 2);
  ctx.textBaseline = "alphabetic";

  // ── TÍTULO GIGANTE CENTRADO ──
  const titleY = catY + 90;
  const titleMaxW = 1800;
  const tGrad = ctx.createLinearGradient(cx - 700, titleY, cx + 700, titleY + 160);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;
  renderBoundedTitle(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), cx, titleY, titleMaxW, 2, 128, 68, "center");
  const titleBottom = titleY + 170;

  // Separador delgado central
  const sepY = titleBottom + 28;
  const sepW = 380;
  const sGrad = ctx.createLinearGradient(cx - sepW / 2, sepY, cx + sepW / 2, sepY);
  sGrad.addColorStop(0, "transparent");
  sGrad.addColorStop(0.5, theme.accentColor);
  sGrad.addColorStop(1, "transparent");
  ctx.fillStyle = sGrad;
  ctx.fillRect(cx - sepW / 2, sepY, sepW, 3);

  // ── TRES BANDAS HORIZONTALES (fecha, lugar, premios) centradas ──
  const bandW = 1700;
  const bandH = 190;
  const bandGap = 20;
  const startY = sepY + 48;
  const bandX = cx - bandW / 2;

  function drawCenteredBand(bandY: number, label: string, value: string, accentColor: string) {
    ctx.save();
    setBlackShadow(ctx, 55, 14, 0.95);
    roundRect(ctx, bandX, bandY, bandW, bandH, 22);
    ctx.fillStyle = "rgba(6, 12, 26, 0.85)";
    ctx.fill();
    ctx.restore();
    roundRect(ctx, bandX, bandY, bandW, bandH, 22);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Etiqueta pequeña arriba-izq
    ctx.font = "700 22px 'Inter', sans-serif";
    ctx.fillStyle = accentColor;
    ctx.textAlign = "left";
    ctx.fillText(label, bandX + 44, bandY + 46);

    // Valor gigante centrado
    ctx.font = "900 60px 'Montserrat', 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.save();
    setBlackShadow(ctx, 20, 6, 0.98);
    wrapTextCentered(ctx, value.toUpperCase(), cx, bandY + 110, bandW - 88, 68, 2);
    ctx.restore();
  }

  drawCenteredBand(startY, "📅  FECHA", data.date || "PRÓXIMAMENTE", theme.accentColor);
  drawCenteredBand(startY + bandH + bandGap, "📍  LUGAR", data.location || "SALADILLO, B.A.", theme.badgeText);
  drawCenteredBand(startY + (bandH + bandGap) * 2, "🏆  PREMIOS", data.prizes || "TROFEOS + EFECTIVO", "#fbbf24");
}

/**
 * LAYOUT 3: split_inverted (Invertido Vanguardia)
 * Logo: Superior DERECHA -> EXACTAMENTE 35% DEL ANCHO (672 px x 262 px)
 * Solo 5 datos, sin texto adicional, tipografías masivas.
 */
function renderLayoutSplitInverted(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: FlyerRenderData,
  theme: ThemeConfig,
  logoImage?: HTMLImageElement | null
) {
  const pad = 70;

  // ── LOGO SUPERIOR DERECHA ──
  const logoW = 672;
  const logoH = 262;
  if (logoImage) drawImageProportional(ctx, logoImage, W - pad - logoW, pad, logoW, logoH, "right");

  // ── CATEGORÍA badge bajo el logo (alineado a la derecha) ──
  const badgeText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 34px 'Montserrat', 'Inter', sans-serif";
  const badgeW = Math.min(ctx.measureText(badgeText).width + 72, 580);
  const badgeH = 70;
  const badgeX = W - pad - badgeW;
  const badgeY = pad + logoH + 22;
  ctx.save();
  setBlackShadow(ctx, 35, 10, 0.95);
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 35);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 35);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
  ctx.textBaseline = "alphabetic";

  // ── TÍTULO PRINCIPAL gigante alineado a la DERECHA ──
  const titleY = badgeY + badgeH + 44;
  const titleMaxW = 920;
  const tGrad = ctx.createLinearGradient(W - pad - titleMaxW, titleY, W - pad, titleY + 160);
  tGrad.addColorStop(0, theme.brandGradient[2]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[0]);
  ctx.fillStyle = tGrad;
  renderBoundedTitle(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), W - pad, titleY, titleMaxW, 3, 120, 72, "right");
  const titleBottom = titleY + 160;

  // ── TARJETA VERTICAL IZQUIERDA con 3 filas (fecha, lugar, premios) ──
  const cardX = pad;
  const cardW = 770;
  const bandH = 240;
  const bandGap = 22;
  const cardTop = pad;
  const cardY = cardTop;

  function drawInfoBand(bandY: number, label: string, value: string, accentColor: string) {
    ctx.save();
    setBlackShadow(ctx, 50, 14, 0.96);
    roundRect(ctx, cardX, bandY, cardW, bandH, 28);
    ctx.fillStyle = "rgba(6, 12, 26, 0.88)";
    ctx.fill();
    ctx.restore();

    roundRect(ctx, cardX, bandY, cardW, bandH, 28);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "700 22px 'Inter', sans-serif";
    ctx.fillStyle = accentColor;
    ctx.textAlign = "left";
    ctx.fillText(label, cardX + 44, bandY + 48);

    ctx.font = "900 64px 'Montserrat', 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.save();
    setBlackShadow(ctx, 22, 6, 0.98);
    wrapText(ctx, value.toUpperCase(), cardX + 44, bandY + 110, cardW - 88, 72, 2);
    ctx.restore();
  }

  drawInfoBand(cardY, "📅  FECHA", data.date || "PRÓXIMAMENTE", theme.accentColor);
  drawInfoBand(cardY + bandH + bandGap, "📍  LUGAR", data.location || "SALADILLO, B.A.", theme.badgeText);
  drawInfoBand(cardY + (bandH + bandGap) * 2, "🏆  PREMIOS", data.prizes || "TROFEOS + EFECTIVO", "#fbbf24");
}

/**
 * LAYOUT 4: magazine_bold (Editorial Deportivo)
 * Logo: Superior DERECHA (banda elegante) -> EXACTAMENTE 35% DEL ANCHO (672 px x 180 px)
 * Todo el lienzo dedicado a los 5 datos con tipografías monumentales, fondo visible.
 */
function renderLayoutMagazineBold(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: FlyerRenderData,
  theme: ThemeConfig,
  logoImage?: HTMLImageElement | null
) {
  const pad = 70;

  // ── CINTA SUPERIOR: categoría izquierda, logo derecha ──
  const bannerY = pad;
  const bannerH = 180;

  // Fondo sutil de la cinta
  ctx.save();
  setBlackShadow(ctx, 40, 10, 0.92);
  roundRect(ctx, pad, bannerY, W - pad * 2, bannerH, 20);
  ctx.fillStyle = "rgba(6, 12, 26, 0.78)";
  ctx.fill();
  ctx.restore();
  roundRect(ctx, pad, bannerY, W - pad * 2, bannerH, 20);
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Categoría badge (izq)
  const catText = (data.category || "CATEGORÍA ABIERTA").toUpperCase();
  ctx.font = "900 34px 'Montserrat', 'Inter', sans-serif";
  const catW = Math.min(ctx.measureText(catText).width + 76, 600);
  const catX = pad + 44;
  const catY = bannerY + 52;
  ctx.save();
  setBlackShadow(ctx, 25, 8, 0.95);
  roundRect(ctx, catX, catY, catW, 76, 38);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, catX, catY, catW, 76, 38);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(catText, catX + catW / 2, catY + 76 / 2);
  ctx.textBaseline = "alphabetic";

  // Logo (derecha de la cinta)
  const logoW = 672;
  const logoH = 120;
  if (logoImage) drawImageProportional(ctx, logoImage, W - pad - logoW, bannerY + 30, logoW, logoH, "right");

  // ── TÍTULO GIGANTE (ocupa casi todo el ancho) ──
  const titleY = bannerY + bannerH + 60;
  const titleMaxW = W - pad * 2;
  const tGrad = ctx.createLinearGradient(pad, titleY, W - pad, titleY + 170);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;
  renderBoundedTitle(ctx, (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(), pad + titleMaxW / 2, titleY, titleMaxW, 2, 132, 72, "center");
  const titleBottom = titleY + 180;

  // Separador delgado central
  const sepY = titleBottom + 32;
  const sepW = 500;
  const sGrad = ctx.createLinearGradient(pad + (titleMaxW - sepW) / 2, sepY, pad + (titleMaxW + sepW) / 2, sepY);
  sGrad.addColorStop(0, "transparent");
  sGrad.addColorStop(0.5, theme.accentColor);
  sGrad.addColorStop(1, "transparent");
  ctx.fillStyle = sGrad;
  ctx.fillRect(pad + (titleMaxW - sepW) / 2, sepY, sepW, 3);

  // ── TRES BANDAS INFORMATIVAS (fecha, lugar, premios) centradas ──
  const bandW = W - pad * 2 - 40;
  const bandH = 200;
  const bandGap = 22;
  const startY = sepY + 56;

  function drawCenteredBand(bandY: number, label: string, value: string, accentColor: string) {
    ctx.save();
    setBlackShadow(ctx, 55, 14, 0.94);
    roundRect(ctx, pad + 20, bandY, bandW, bandH, 20);
    ctx.fillStyle = "rgba(6, 12, 26, 0.82)";
    ctx.fill();
    ctx.restore();
    roundRect(ctx, pad + 20, bandY, bandW, bandH, 20);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "700 22px 'Inter', sans-serif";
    ctx.fillStyle = accentColor;
    ctx.textAlign = "left";
    ctx.fillText(label, pad + 60, bandY + 46);

    ctx.font = "900 58px 'Montserrat', 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.save();
    setBlackShadow(ctx, 20, 6, 0.98);
    wrapTextCentered(ctx, value.toUpperCase(), pad + 20 + bandW / 2, bandY + 120, bandW - 80, 68, 2);
    ctx.restore();
  }

  drawCenteredBand(startY, "📅  FECHA", data.date || "PRÓXIMAMENTE", theme.accentColor);
  drawCenteredBand(startY + bandH + bandGap, "📍  LUGAR", data.location || "SALADILLO, B.A.", theme.badgeText);
  drawCenteredBand(startY + (bandH + bandGap) * 2, "🏆  PREMIOS", data.prizes || "TROFEOS + EFECTIVO", "#fbbf24");
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

  // Velo ultra sutil para legibilidad sin tapar la foto de fondo
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "rgba(4, 9, 20, 0.15)");
  grad.addColorStop(0.5, "rgba(4, 9, 20, 0.10)");
  grad.addColorStop(1, "rgba(4, 9, 20, 0.18)");
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
}
