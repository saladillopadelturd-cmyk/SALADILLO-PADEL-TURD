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

  // Etiqueta SPONSORS (ampliada para legibilidad en pantallas pequeñas)
  ctx.font = "bold 26px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.textAlign = "left";
  ctx.fillText("MAIN SPONSORS & PARTNERS OFICIALES", 70, barY + 44);

  // Pills de sponsors
  const sponsorList = (
    sponsors && sponsors.length > 0
      ? sponsors
      : ["HEAD PADEL", "BULLPADEL", "NOX PADEL", "WILSON", "BABOLAT", "MUNICH"]
  ).slice(0, 6);

  const spGap = 24;
  const spY = barY + 70;
  const spH = 66;
  const availableW = W - 140;

  // Auto-ajuste: reduce la fuente de las píldoras si el total excede el ancho disponible
  let spFont = 30;
  const measurePills = (fs: number) => {
    ctx.font = `bold ${fs}px 'Montserrat', 'Inter', sans-serif`;
    return sponsorList.map((s) => Math.max(ctx.measureText(s.toUpperCase()).width + 56, 160));
  };
  let spWidths = measurePills(spFont);
  let spTotal = spWidths.reduce((a, b) => a + b, 0) + spGap * (spWidths.length - 1);
  while (spTotal > availableW && spFont > 18) {
    spFont -= 2;
    spWidths = measurePills(spFont);
    spTotal = spWidths.reduce((a, b) => a + b, 0) + spGap * (spWidths.length - 1);
  }

  ctx.font = `bold ${spFont}px 'Montserrat', 'Inter', sans-serif`;
  let spX = 70;
  sponsorList.forEach((spon, idx) => {
    const spW = spWidths[idx];

    ctx.save();
    setBlackShadow(ctx, 35, 10, 0.98);
    roundRect(ctx, spX, spY, spW, spH, 14);
    ctx.fillStyle = "rgba(12, 18, 32, 0.85)";
    ctx.fill();
    ctx.restore();

    roundRect(ctx, spX, spY, spW, spH, 14);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(spon.toUpperCase(), spX + spW / 2, spY + spH / 2);
    ctx.textBaseline = "alphabetic";

    spX += spW + spGap;
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
    ctx.shadowColor = "rgba(0, 0, 0, 0.98)";
    ctx.shadowBlur = 45;
    drawImageProportional(ctx, logoImage, logoX, logoY, logoW, logoH, "left");
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, logoW, logoH, 20);
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.font = "900 32px 'Montserrat', 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SALADILLO PADEL TOUR", logoX + logoW / 2, logoY + logoH / 2 + 10);
  }

  // Badge categoría alineado inmediatamente debajo del logo para optimizar el espacio vertical
  const badgeX = logoX;
  const badgeY = logoY + logoH + 20;
  const badgeText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  const catWidth = Math.min(ctx.measureText(badgeText).width + 64, 540);
  const badgeH = 62;

  ctx.save();
  setBlackShadow(ctx, 45, 12, 0.98);
  roundRect(ctx, badgeX, badgeY, catWidth, badgeH, 31);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, badgeX, badgeY, catWidth, badgeH, 31);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + catWidth / 2, badgeY + 41);

  // 2. TÍTULO PRINCIPAL (COLUMNA IZQUIERDA) - 100% DENTRO DE LOS LÍMITES
  const titleY = badgeY + badgeH + 64;
  const titleMaxW = 920;
  const tGrad = ctx.createLinearGradient(70, titleY, 950, titleY + 140);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  // Renderizado delimitado con escalado adaptativo
  const titleResult = renderBoundedTitle(
    ctx,
    (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(),
    70,
    titleY,
    titleMaxW,
    3,
    104,
    66,
    "left"
  );

  // Línea de acento decorativa doble con gradiente
  const accentLineY = titleResult.endY + 28;
  const lineGrad = ctx.createLinearGradient(70, accentLineY, 320, accentLineY);
  lineGrad.addColorStop(0, theme.accentColor);
  lineGrad.addColorStop(1, "transparent");
  ctx.fillStyle = lineGrad;
  ctx.fillRect(70, accentLineY, 250, 6);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(70, accentLineY, 40, 6);

  // Subtítulo informativo (ampliado)
  ctx.font = "600 30px 'Inter', sans-serif";
  ctx.fillStyle = "#f1f5f9";
  ctx.save();
  setBlackShadow(ctx, 25, 6, 0.98);
  wrapText(
    ctx,
    "¡Viví la emoción del mejor pádel! Inscripciones abiertas para todas las parejas de la región.",
    70,
    accentLineY + 52,
    titleMaxW,
    42,
    2
  );
  ctx.restore();

  // CTA Button (Izquierda abajo)
  const ctaW = 480;
  const ctaH = 74;
  const ctaX = 70;
  const ctaY = 824;

  ctx.save();
  setBlackShadow(ctx, 55, 18, 0.98);
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 20);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, theme.brandGradient[1]);
  ctaGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = ctaGrad;
  ctx.fill();
  ctx.restore();

  // Borde brillante en botón
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 20);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.fillText("¡SUMATE AL CUADRO! ⚡", ctaX + ctaW / 2, ctaY + 46);

  // 3. TARJETA VERTICAL LATERAL (DERECHA) - LLENA EL ESPACIO COMPLETO
  const cardX = 1040;
  const cardY = 50;
  const cardW = 810;
  const cardH = 825;

  // Tarjeta elevada con sombra ultra profunda
  drawElevatedCard(ctx, cardX, cardY, cardW, cardH, 30, "rgba(8, 14, 28, 0.92)", theme.cardBorder, 3);
  drawSportTechDecorations(ctx, cardX, cardY, cardW, cardH, theme.accentColor);

  // Cabecera de la tarjeta
  roundRect(ctx, cardX, cardY, cardW, 85, 30);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fill();

  ctx.font = "900 34px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText("INFORMACIÓN DEL TORNEO", cardX + 50, cardY + 58);

  // Fila 1: FECHA
  const row1Y = cardY + 160;
  ctx.font = "800 26px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📅 CRONOGRAMA DE DISPUTA", cardX + 50, row1Y);

  ctx.font = "900 44px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.save();
  setBlackShadow(ctx, 22, 6, 0.95);
  wrapText(ctx, (data.date || "PRÓXIMAMENTE").toUpperCase(), cardX + 50, row1Y + 52, cardW - 100, 52, 2);
  ctx.restore();

  // Fila 2: SEDE
  const row2Y = cardY + 310;
  ctx.font = "800 26px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📍 COMPLEJO & UBICACIÓN", cardX + 50, row2Y);

  ctx.font = "900 42px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.save();
  setBlackShadow(ctx, 22, 6, 0.95);
  wrapText(ctx, (data.location || "SALADILLO, BUENOS AIRES").toUpperCase(), cardX + 50, row2Y + 52, cardW - 100, 50, 2);
  ctx.restore();

  // Fila 3: PREMIOS DESTACADOS
  const row3Y = cardY + 475;
  const prizeBoxW = cardW - 100;
  const prizeBoxH = 220;

  ctx.save();
  setBlackShadow(ctx, 50, 16, 0.98);
  roundRect(ctx, cardX + 50, row3Y, prizeBoxW, prizeBoxH, 24);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, cardX + 50, row3Y, prizeBoxW, prizeBoxH, 24);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.fillText("🏆 BOLSA DE PREMIOS OFICIAL", cardX + 80, row3Y + 56);

  ctx.font = "900 58px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.save();
  setBlackShadow(ctx, 25, 8, 0.98);
  wrapText(ctx, (data.prizes || "TROFEOS + EFECTIVO").toUpperCase(), cardX + 80, row3Y + 130, prizeBoxW - 50, 60, 1);
  ctx.restore();

  ctx.font = "600 24px 'Inter', sans-serif";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText("Indumentaria pro + Puntos para el ranking anual SPT", cardX + 80, row3Y + 188);

  // Fila 4: Footer de tarjeta
  ctx.font = "bold 24px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "center";
  ctx.fillText("INSCRIPCIÓN ONLINE OFICIAL EN SPT-PADEL-TOUR.COM", cardX + cardW / 2, cardY + cardH - 38);
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

  // 1. HALO LUMINOSO CENTRAL PROFUNDO
  const haloGrad = ctx.createRadialGradient(centerX, 150, 10, centerX, 150, 360);
  haloGrad.addColorStop(0, theme.cardGlow);
  haloGrad.addColorStop(0.6, "rgba(0, 0, 0, 0.4)");
  haloGrad.addColorStop(1, "transparent");
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(centerX, 150, 360, 0, Math.PI * 2);
  ctx.fill();

  // 2. LOGO SPT CENTRO SUPERIOR (35% exacto de 1920px -> 672px x 262px)
  const logoW = 672;
  const logoH = 262;
  const logoX = centerX - logoW / 2;
  const logoY = 25;

  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.98)";
    ctx.shadowBlur = 45;
    drawImageProportional(ctx, logoImage, logoX, logoY, logoW, logoH, "center");
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, logoW, logoH, 20);
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = "900 36px 'Montserrat', 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SALADILLO PADEL TOUR", centerX, logoY + logoH / 2 + 12);
  }

  // Pill de Categoría justo abajo del logo
  const catText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  const catW = Math.min(ctx.measureText(catText).width + 68, 720);
  const catY = logoY + logoH + 15;
  ctx.save();
  setBlackShadow(ctx, 35, 10, 0.98);
  roundRect(ctx, centerX - catW / 2, catY, catW, 58, 29);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, centerX - catW / 2, catY, catW, 58, 29);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(catText, centerX, catY + 39);

  // 3. TÍTULO CENTRADO GIGANTE - 100% DENTRO DE LOS LÍMITES
  const titleY = catY + 106;
  const titleMaxW = 1820;
  const tGrad = ctx.createLinearGradient(centerX - 600, titleY, centerX + 600, titleY + 80);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  renderBoundedTitle(
    ctx,
    (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(),
    centerX,
    titleY,
    titleMaxW,
    1,
    118,
    52,
    "center"
  );

  // Línea decorativa central doble
  const lineW = 320;
  const lineY = titleY + 24;
  const cLineGrad = ctx.createLinearGradient(centerX - lineW / 2, lineY, centerX + lineW / 2, lineY);
  cLineGrad.addColorStop(0, "transparent");
  cLineGrad.addColorStop(0.5, theme.accentColor);
  cLineGrad.addColorStop(1, "transparent");
  ctx.fillStyle = cLineGrad;
  ctx.fillRect(centerX - lineW / 2, lineY, lineW, 4);

  // 4. TRES TARJETAS HORIZONTALES (PODIO) - ELEVADAS CON SOMBRA NEGRA PROFUNDA
  const modY = titleY + 48;
  const modH = 265;
  const gap = 30;
  const totalW = 1780;
  const modW = (totalW - gap * 2) / 3;
  const startX = (W - totalW) / 2;

  // Tarjeta 1: FECHA
  const card1X = startX;
  drawElevatedCard(ctx, card1X, modY, modW, modH, 24, "rgba(8, 14, 28, 0.92)", theme.cardBorder, 2.5);
  drawSportTechDecorations(ctx, card1X, modY, modW, modH, theme.accentColor);

  ctx.font = "900 28px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "center";
  ctx.fillText("📅 CRONOGRAMA", card1X + modW / 2, modY + 52);

  ctx.font = "900 40px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.save();
  setBlackShadow(ctx, 20, 6, 0.95);
  wrapTextCentered(ctx, (data.date || "PRÓXIMAMENTE").toUpperCase(), card1X + modW / 2, modY + 118, modW - 40, 48, 2);
  ctx.restore();

  ctx.font = "600 24px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("Turnos y cuadros confirmados", card1X + modW / 2, modY + 220);

  // Tarjeta 2: PREMIOS (Tarjeta destacada central con altura extendida)
  const card2X = startX + modW + gap;
  const card2Y = modY - 15;
  const card2H = modH + 30;

  ctx.save();
  setBlackShadow(ctx, 80, 24, 0.98);
  roundRect(ctx, card2X, card2Y, modW, card2H, 26);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, card2X, card2Y, modW, card2H, 26);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  drawSportTechDecorations(ctx, card2X, card2Y, modW, card2H, theme.accentColor);

  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText("🏆 BOLSA DE PREMIOS", card2X + modW / 2, modY + 48);

  ctx.font = "900 54px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.save();
  setBlackShadow(ctx, 25, 8, 0.98);
  wrapTextCentered(ctx, (data.prizes || "$500.000 EN EFECTIVO").toUpperCase(), card2X + modW / 2, modY + 122, modW - 40, 58, 2);
  ctx.restore();

  ctx.font = "700 24px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.fillText("+ Palas Pro + Puntos del Ranking", card2X + modW / 2, modY + 238);

  // Tarjeta 3: SEDE
  const card3X = startX + (modW + gap) * 2;
  drawElevatedCard(ctx, card3X, modY, modW, modH, 24, "rgba(8, 14, 28, 0.92)", theme.cardBorder, 2.5);
  drawSportTechDecorations(ctx, card3X, modY, modW, modH, theme.accentColor);

  ctx.font = "900 28px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "center";
  ctx.fillText("📍 SEDE & CLUB", card3X + modW / 2, modY + 52);

  ctx.font = "900 40px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.save();
  setBlackShadow(ctx, 20, 6, 0.95);
  wrapTextCentered(ctx, (data.location || "COMPLEJO CENTRAL").toUpperCase(), card3X + modW / 2, modY + 118, modW - 40, 48, 2);
  ctx.restore();

  ctx.font = "600 24px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("Canchas de cristal indoor", card3X + modW / 2, modY + 220);

  // 5. CTA BUTTON CENTRAL (Amplitud optimizada para contener perfectamente el texto)
  const ctaW = 600;
  const ctaH = 74;
  const ctaX = centerX - ctaW / 2;
  const ctaY = modY + modH + 28;

  ctx.save();
  setBlackShadow(ctx, 60, 18, 0.98);
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 22);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, theme.brandGradient[1]);
  ctaGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = ctaGrad;
  ctx.fill();
  ctx.restore();

  // Borde nítido para despegar
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 22);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "900 26px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("INSCRIPCIONES ABIERTAS AHORA 🎾", centerX, ctaY + ctaH / 2);
  ctx.textBaseline = "alphabetic";
}

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
    ctx.shadowColor = "rgba(0, 0, 0, 0.98)";
    ctx.shadowBlur = 45;
    drawImageProportional(ctx, logoImage, logoX, logoY, logoW, logoH, "right");
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, logoW, logoH, 20);
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.font = "900 32px 'Montserrat', 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SALADILLO PADEL TOUR", logoX + logoW / 2, logoY + logoH / 2 + 10);
  }

  // Badge categoría debajo del logo alineado a la derecha
  const badgeText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  const catWidth = Math.min(ctx.measureText(badgeText).width + 64, 540);
  const badgeH = 62;
  const badgeX = W - 70 - catWidth;
  const badgeY = logoY + logoH + 20;

  ctx.save();
  setBlackShadow(ctx, 45, 12, 0.98);
  roundRect(ctx, badgeX, badgeY, catWidth, badgeH, 31);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, badgeX, badgeY, catWidth, badgeH, 31);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + catWidth / 2, badgeY + 41);

  // 2. TARJETA VERTICAL A LA IZQUIERDA - LLENA EL ESPACIO COMPLETO
  const cardX = 70;
  const cardY = 50;
  const cardW = 810;
  const cardH = 825;

  drawElevatedCard(ctx, cardX, cardY, cardW, cardH, 30, "rgba(8, 14, 28, 0.92)", theme.cardBorder, 3);
  drawSportTechDecorations(ctx, cardX, cardY, cardW, cardH, theme.accentColor);

  roundRect(ctx, cardX, cardY, cardW, 85, 30);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fill();

  ctx.font = "900 34px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText("COORDENADAS DEL TORNEO", cardX + 50, cardY + 58);

  // Fila 1: FECHA
  const row1Y = cardY + 160;
  ctx.font = "800 26px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📅 FECHA DE DISPUTA", cardX + 50, row1Y);

  ctx.font = "900 44px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.save();
  setBlackShadow(ctx, 22, 6, 0.95);
  wrapText(ctx, (data.date || "PRÓXIMAMENTE").toUpperCase(), cardX + 50, row1Y + 52, cardW - 100, 52, 2);
  ctx.restore();

  // Fila 2: SEDE
  const row2Y = cardY + 310;
  ctx.font = "800 26px 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📍 COMPLEJO SEDE", cardX + 50, row2Y);

  ctx.font = "900 42px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.save();
  setBlackShadow(ctx, 22, 6, 0.95);
  wrapText(ctx, (data.location || "SALADILLO, BUENOS AIRES").toUpperCase(), cardX + 50, row2Y + 52, cardW - 100, 50, 2);
  ctx.restore();

  // Fila 3: PREMIOS
  const row3Y = cardY + 475;
  const prizeBoxW = cardW - 100;
  const prizeBoxH = 220;

  ctx.save();
  setBlackShadow(ctx, 50, 16, 0.98);
  roundRect(ctx, cardX + 50, row3Y, prizeBoxW, prizeBoxH, 24);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, cardX + 50, row3Y, prizeBoxW, prizeBoxH, 24);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.fillText("🏆 PREMIOS Y RECONOCIMIENTOS", cardX + 80, row3Y + 56);

  ctx.font = "900 58px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.save();
  setBlackShadow(ctx, 25, 8, 0.98);
  wrapText(ctx, (data.prizes || "TROFEOS + EFECTIVO").toUpperCase(), cardX + 80, row3Y + 130, prizeBoxW - 50, 60, 1);
  ctx.restore();

  ctx.font = "600 24px 'Inter', sans-serif";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText("Suma puntos para el ranking oficial Saladillo", cardX + 80, row3Y + 188);

  // Footer tarjeta
  ctx.font = "bold 24px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "center";
  ctx.fillText("INSCRIPCIÓN ONLINE OFICIAL EN SPT-PADEL-TOUR.COM", cardX + cardW / 2, cardY + cardH - 38);

  // 3. TÍTULO Y CONTENIDO A LA DERECHA (ALINEADO A LA DERECHA) - 100% DENTRO DE LOS LÍMITES
  const rightX = W - 70;
  const titleY = badgeY + badgeH + 68;
  const titleMaxW = 920;

  const tGrad = ctx.createLinearGradient(rightX - 700, titleY, rightX, titleY + 140);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  const titleResult = renderBoundedTitle(
    ctx,
    (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(),
    rightX,
    titleY,
    titleMaxW,
    3,
    104,
    66,
    "right"
  );

  // Línea de acento a la derecha
  const accentLineY = titleResult.endY + 28;
  const lineGrad = ctx.createLinearGradient(rightX - 250, accentLineY, rightX, accentLineY);
  lineGrad.addColorStop(0, "transparent");
  lineGrad.addColorStop(1, theme.accentColor);
  ctx.fillStyle = lineGrad;
  ctx.fillRect(rightX - 250, accentLineY, 250, 6);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(rightX - 40, accentLineY, 40, 6);

  // Subtítulo
  ctx.font = "600 30px 'Inter', sans-serif";
  ctx.fillStyle = "#f1f5f9";
  ctx.save();
  setBlackShadow(ctx, 25, 6, 0.98);
  wrapTextRight(
    ctx,
    "Demostrá tu nivel en la pista más competitiva. Cupos limitados por estricto orden de inscripción.",
    rightX,
    accentLineY + 52,
    titleMaxW,
    42,
    2
  );
  ctx.restore();

  // CTA Button (Alineado a la derecha)
  const ctaW = 480;
  const ctaH = 74;
  const ctaX = rightX - ctaW;
  const ctaY = 824;

  ctx.save();
  setBlackShadow(ctx, 55, 18, 0.98);
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 20);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, theme.brandGradient[1]);
  ctaGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = ctaGrad;
  ctx.fill();
  ctx.restore();

  // Borde brillante en botón
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 20);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.fillText("¡ANOTATE CON TU PAREJA! ⚡", ctaX + ctaW / 2, ctaY + 46);
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
  drawElevatedCard(ctx, 70, bannerY, W - 140, bannerH, 24, "rgba(8, 14, 28, 0.92)", "rgba(255, 255, 255, 0.18)", 2);
  drawSportTechDecorations(ctx, 70, bannerY, W - 140, bannerH, theme.accentColor);

  // Badge categoría en la cinta (Izquierda)
  const catText = (data.category || "CATEGORÍA ABIERTA").toUpperCase();
  ctx.font = "900 32px 'Montserrat', 'Inter', sans-serif";
  const catW = Math.min(ctx.measureText(catText).width + 76, 580);
  const catX = 120;

  ctx.save();
  setBlackShadow(ctx, 35, 10, 0.98);
  roundRect(ctx, catX, bannerY + 50, catW, 76, 38);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, catX, bannerY + 50, catW, 76, 38);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(catText, catX + catW / 2, bannerY + 99);

  // 2. LOGO EN LA CINTA A LA DERECHA: 35% exacto de 1920px = 672px
  const logoW = 672;
  const logoH = 155;
  const logoX = W - 100 - logoW;
  const logoY = bannerY + 10;

  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.98)";
    ctx.shadowBlur = 40;
    drawImageProportional(ctx, logoImage, logoX, logoY, logoW, logoH, "right");
    ctx.restore();
  } else {
    roundRect(ctx, logoX, logoY, logoW, logoH, 16);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("SALADILLO PADEL TOUR", logoX + logoW / 2, logoY + logoH / 2 + 10);
  }

  // 3. TITULAR EDITORIAL MASIVO - 100% DENTRO DE LOS LÍMITES
  const titleY = bannerY + bannerH + 90;
  const titleMaxW = 1780;
  const tGrad = ctx.createLinearGradient(70, titleY, 1300, titleY + 100);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.6, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = tGrad;

  renderBoundedTitle(
    ctx,
    (data.title || "GRAN TORNEO RELÁMPAGO").toUpperCase(),
    70,
    titleY,
    titleMaxW,
    1,
    116,
    58,
    "left"
  );

  // Línea deportiva de acento
  const eLineY = titleY + 22;
  ctx.fillStyle = theme.accentColor;
  ctx.fillRect(70, eLineY, 200, 5);
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillRect(280, eLineY, 50, 5);

  // 4. MÓDULOS DE CONTENIDO - OCUPAN TODO EL ESPACIO HASTA EL FOOTER
  const modY = titleY + 45;
  const colW = 560;
  const colH = 260;

  // Módulo A: FECHA (Izquierda)
  drawElevatedCard(ctx, 70, modY, colW, colH, 24, "rgba(8, 14, 28, 0.92)", theme.cardBorder, 2.5);
  drawSportTechDecorations(ctx, 70, modY, colW, colH, theme.accentColor);

  ctx.font = "900 28px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "left";
  ctx.fillText("📅 FECHA DE JUEGO", 110, modY + 54);

  ctx.font = "900 40px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.save();
  setBlackShadow(ctx, 22, 6, 0.95);
  wrapText(ctx, (data.date || "PRÓXIMO FIN DE SEMANA").toUpperCase(), 110, modY + 118, colW - 80, 48, 2);
  ctx.restore();

  ctx.font = "600 22px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Fase de grupos + Playoffs eliminatorios", 110, modY + 218);

  // Módulo B: SEDE (Centro)
  const col2X = 70 + colW + 30;
  drawElevatedCard(ctx, col2X, modY, colW, colH, 24, "rgba(8, 14, 28, 0.92)", theme.cardBorder, 2.5);
  drawSportTechDecorations(ctx, col2X, modY, colW, colH, theme.accentColor);

  ctx.font = "900 28px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.fillText("📍 COMPLEJO OFICIAL", col2X + 40, modY + 54);

  ctx.font = "900 40px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.save();
  setBlackShadow(ctx, 22, 6, 0.95);
  wrapText(ctx, (data.location || "COMPLEJO CENTRAL SALADILLO").toUpperCase(), col2X + 40, modY + 118, colW - 80, 48, 2);
  ctx.restore();

  ctx.font = "600 22px 'Inter', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Vestuarios, bar y vista panorámica", col2X + 40, modY + 218);

  // Módulo C: PREMIOS + CTA (Derecha)
  const col3X = col2X + colW + 30;
  const col3W = W - col3X - 70;

  ctx.save();
  setBlackShadow(ctx, 80, 24, 0.98);
  roundRect(ctx, col3X, modY, col3W, colH + 215, 26);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, col3X, modY, col3W, colH + 215, 26);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  drawSportTechDecorations(ctx, col3X, modY, col3W, colH + 215, theme.accentColor);

  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.fillText("🏆 PREMIOS PRINCIPALES", col3X + col3W / 2, modY + 58);

  ctx.font = "900 58px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.save();
  setBlackShadow(ctx, 25, 8, 0.98);
  wrapTextCentered(ctx, (data.prizes || "PREMIOS EN EFECTIVO").toUpperCase(), col3X + col3W / 2, modY + 136, col3W - 40, 62, 2);
  ctx.restore();

  ctx.font = "700 26px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = theme.badgeText;
  ctx.fillText("+ Trofeos para Campeones y Finalistas", col3X + col3W / 2, modY + 256);

  ctx.font = "600 23px 'Inter', sans-serif";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText("Indumentaria técnica oficial", col3X + col3W / 2, modY + 300);

  // CTA integrado en tarjeta derecha
  const ctaH = 74;
  const ctaW = col3W - 70;
  const ctaX = col3X + 35;
  const ctaY = modY + 340;

  ctx.save();
  setBlackShadow(ctx, 55, 18, 0.98);
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 18);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, theme.brandGradient[1]);
  ctaGrad.addColorStop(1, theme.brandGradient[2]);
  ctx.fillStyle = ctaGrad;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 18);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "900 28px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = "#000000";
  ctx.fillText("RESERVAR LUGAR AHORA ⚡", col3X + col3W / 2, ctaY + 46);

  // Frase publicitaria izquierda abajo
  const bottomBoxX = 70;
  const bottomBoxY = modY + colH + 25;
  const bottomBoxW = colW * 2 + 30;
  const bottomBoxH = 220;

  drawElevatedCard(ctx, bottomBoxX, bottomBoxY, bottomBoxW, bottomBoxH, 22, "rgba(8, 14, 28, 0.90)", "rgba(255, 255, 255, 0.12)", 1.5);
  drawSportTechDecorations(ctx, bottomBoxX, bottomBoxY, bottomBoxW, bottomBoxH, theme.accentColor);

  ctx.font = "bold 30px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "left";
  ctx.fillText("⭐ COMPETICIÓN DE MÁXIMO NIVEL", bottomBoxX + 40, bottomBoxY + 56);

  ctx.font = "600 24px 'Inter', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  wrapText(
    ctx,
    "Todos los partidos cuentan para el Ranking General Anual. Transmisión de finales en vivo y cobertura fotográfica profesional de cada encuentro.",
    bottomBoxX + 40,
    bottomBoxY + 104,
    bottomBoxW - 80,
    38,
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

    // Velo suave con +5% de opacidad: contraste equilibrado y elegante con fondo visible
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "rgba(4, 9, 20, 0.23)");
    grad.addColorStop(0.5, "rgba(4, 9, 20, 0.15)");
    grad.addColorStop(1, "rgba(4, 9, 20, 0.29)");
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
