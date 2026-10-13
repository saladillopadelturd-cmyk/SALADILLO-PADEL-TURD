/**
 * SPT (Saladillo Padel Tour) - Canvas Flyer Compositor
 * Renderiza composiciones vectoriales en formato HORIZONTAL (1920x864 px - 20:9)
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
    description: "Logo superior izquierda, títulos jerárquicos y 3 tarjetas verticales a la derecha",
    logoPosition: "Superior Izquierda",
  },
  hero_center: {
    name: "Impacto Central",
    description: "Logo central panorámico con halo, títulos masivos y 3 podios horizontales en la base",
    logoPosition: "Centro Superior",
  },
  split_inverted: {
    name: "Invertido Vanguardia",
    description: "3 tarjetas verticales a la izquierda, logo superior derecha y títulos a derecha",
    logoPosition: "Superior Derecha",
  },
  magazine_bold: {
    name: "Editorial Deportivo",
    description: "Cinta panorámica superior con logo, titular imponente y 3 podios en la base",
    logoPosition: "Cinta Superior",
  },
};

export const THEMES: Record<FlyerTheme, ThemeConfig> = {
  neon_emerald: {
    name: "Verde Padel Neón",
    badgeBg: "rgba(4, 9, 20, 0.88)",
    badgeBorder: "rgba(52, 211, 153, 0.95)",
    badgeText: "#ffffff",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#6ee7b7", "#10b981"],
    accentColor: "#10b981",
    cardBorder: "rgba(52, 211, 153, 0.65)",
    cardGlow: "rgba(16, 185, 129, 0.35)",
    footerBg: "rgba(4, 15, 10, 0.96)",
  },
  gold_luxury: {
    name: "Oro Imperial & Master",
    badgeBg: "rgba(4, 9, 20, 0.88)",
    badgeBorder: "rgba(251, 191, 36, 0.95)",
    badgeText: "#ffffff",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#fde047", "#f59e0b"],
    accentColor: "#f59e0b",
    cardBorder: "rgba(251, 191, 36, 0.70)",
    cardGlow: "rgba(245, 158, 11, 0.38)",
    footerBg: "rgba(16, 11, 4, 0.96)",
  },
  cyan_glacier: {
    name: "Azul Eléctrico Pista",
    badgeBg: "rgba(4, 9, 20, 0.88)",
    badgeBorder: "rgba(56, 189, 248, 0.95)",
    badgeText: "#ffffff",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#7dd3fc", "#0284c7"],
    accentColor: "#06b6d4",
    cardBorder: "rgba(56, 189, 248, 0.68)",
    cardGlow: "rgba(6, 182, 212, 0.35)",
    footerBg: "rgba(4, 12, 22, 0.96)",
  },
  fire_sunset: {
    name: "Fuego & Competencia",
    badgeBg: "rgba(4, 9, 20, 0.88)",
    badgeBorder: "rgba(251, 146, 60, 0.95)",
    badgeText: "#ffffff",
    brandPrimaryText: "#ffffff",
    brandGradient: ["#ffffff", "#fdba74", "#f97316"],
    accentColor: "#f97316",
    cardBorder: "rgba(251, 146, 60, 0.70)",
    cardGlow: "rgba(249, 115, 22, 0.38)",
    footerBg: "rgba(18, 5, 5, 0.96)",
  },
  cyber_violet: {
    name: "Cyber Violeta Padel",
    badgeBg: "rgba(4, 9, 20, 0.88)",
    badgeBorder: "rgba(216, 180, 254, 0.95)",
    badgeText: "#ffffff",
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
 * Divide `count` elementos uniformemente dentro de un rectángulo, devolviendo
 * { top, h } para el índice `i`. Garantiza margen interno simétrico y que el
 * último elemento termine EXACTAMENTE en el borde inferior (nada desborda).
 */
function stackSlot(top: number, bottom: number, count: number, gap: number, i: number) {
  const h = (bottom - top - gap * (count - 1)) / count;
  return { y: top + i * (h + gap), h };
}

/**
 * Divide un texto en 1 o 2 líneas equilibradas por palabras completas.
 * Si es 1 sola palabra, nunca la divide a la mitad.
 */
function splitTextIntoTwoLines(text: string): string[] {
  const words = String(text || "").trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["", ""];
  if (words.length === 1) return [words[0], ""];

  // Encuentra la partición por palabras que minimiza la diferencia de longitud entre ambas líneas
  let bestSplit = [
    words.slice(0, Math.ceil(words.length / 2)).join(" "),
    words.slice(Math.ceil(words.length / 2)).join(" "),
  ];
  let minDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const l1 = words.slice(0, i).join(" ");
    const l2 = words.slice(i).join(" ");
    const diff = Math.abs(l1.length - l2.length);
    if (diff < minDiff) {
      minDiff = diff;
      bestSplit = [l1, l2];
    }
  }
  return bestSplit;
}

/**
 * Dibuja texto de datos (1 o 2 líneas) escalando dinámicamente la fuente para llenar
 * el rectángulo disponible sin colisiones verticales ni desbordes.
 */
function fitDrawTwoLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  centerY: number,
  maxW: number,
  maxH: number,
  maxFS: number,
  fillStyle: string | CanvasGradient | CanvasPattern,
  shadowBlur = 25
): number {
  const lines = splitTextIntoTwoLines(text).filter(Boolean);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = fillStyle;

  if (lines.length === 0) return centerY;

  const isSingleLine = lines.length === 1;
  let bestFS = 14;

  for (let fs = maxFS; fs >= 14; fs -= 2) {
    ctx.font = `900 ${fs}px 'Montserrat', 'Inter', sans-serif`;
    const lh = fs * 1.14;
    const tooWide = lines.some((l) => ctx.measureText(l).width > maxW);
    if (tooWide) continue;
    const totalTextH = isSingleLine ? fs : 2 * lh;
    if (totalTextH <= maxH) {
      bestFS = fs;
      break;
    }
  }

  ctx.font = `900 ${bestFS}px 'Montserrat', 'Inter', sans-serif`;
  ctx.save();
  setBlackShadow(ctx, shadowBlur, 10, 0.98);

  if (isSingleLine) {
    ctx.fillText(lines[0], x, centerY);
    ctx.restore();
    ctx.textBaseline = "alphabetic";
    return centerY;
  }

  const lh = bestFS * 1.14;
  const totalH = 2 * lh;
  const startY = centerY - totalH / 2 + lh / 2;

  ctx.fillText(lines[0], x, startY);
  ctx.fillText(lines[1], x, startY + lh);
  ctx.restore();
  ctx.textBaseline = "alphabetic";
  return startY + lh + lh / 2;
}

/**
 * Dibuja un bloque de hasta 3 líneas escalando la fuente para que entre 100%
 * dentro del rectángulo (maxW × maxH), centrado verticalmente en centerY.
 * Devuelve la posición Y de la primer línea del texto.
 */
function fitDrawLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  centerY: number,
  maxW: number,
  maxH: number,
  maxLines: number,
  align: "left" | "center" | "right",
  maxFS: number,
  fillStyle: string | CanvasGradient | CanvasPattern,
  shadowBlur = 30
): number {
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = fillStyle;

  const words = String(text || "").trim().toUpperCase().split(/\s+/).filter(Boolean);
  let lines: string[] = [text.toUpperCase()];
  let lh = 12;

  if (words.length > 0) {
    let fs = maxFS;
    let best: { fs: number; lines: string[] } | null = null;

    const wrapInto = (size: number) => {
      ctx.font = `900 ${size}px 'Montserrat', 'Inter', sans-serif`;
      const ls: string[] = [];
      let cur = "";
      for (const w of words) {
        const t = cur ? cur + " " + w : w;
        if (ctx.measureText(t).width > maxW && cur) {
          ls.push(cur);
          cur = w;
        } else {
          cur = t;
        }
      }
      if (cur) ls.push(cur);
      return ls;
    };

    for (; fs >= 14; fs -= 2) {
      ctx.font = `900 ${fs}px 'Montserrat', 'Inter', sans-serif`;
      const tooWide = words.some((w) => ctx.measureText(w).width > maxW);
      if (tooWide) continue;
      const ls = wrapInto(fs).slice(0, maxLines);
      const lineH = fs * 1.14;
      if (ls.length * lineH <= maxH + lineH * 0.08) {
        best = { fs, lines: ls };
        break;
      }
    }

    if (best) {
      lines = best.lines;
      ctx.font = `900 ${best.fs}px 'Montserrat', 'Inter', sans-serif`;
      lh = best.fs * 1.14;
    } else {
      let fs = maxFS;
      const ls = wrapInto(fs).slice(0, maxLines);
      const longest = Math.max(1, ...ls.map((l) => ctx.measureText(l).width));
      const shrinkW = longest > maxW ? maxW / longest : 1;
      fs = Math.max(14, Math.round(fs * shrinkW));
      const finalLines = wrapInto(fs).slice(0, maxLines);
      finalLines.forEach((l, idx) => {
        while (ctx.measureText(l).width > maxW && l.length > 1) finalLines[idx] = l.slice(0, -1);
        l = finalLines[idx];
      });
      finalLines[finalLines.length - 1] = finalLines[finalLines.length - 1].trim() + "...";
      lines = finalLines;
      lh = fs * 1.14;
    }
  }

  // Recorte de seguridad: cualquier línea sigue dentro de maxW.
  lines = lines.map((l) => {
    let s = l;
    while (ctx.measureText(s).width > maxW && s.length > 1) s = s.slice(0, -1);
    return s;
  });

  const total = lines.length * lh;
  const drawYs = lines.map((_, idx) => centerY - total / 2 + idx * lh + lh / 2);

  ctx.save();
  setBlackShadow(ctx, shadowBlur, 12, 0.99);
  for (let idx = 0; idx < lines.length; idx++) {
    ctx.fillText(lines[idx], x, drawYs[idx]);
  }
  ctx.restore();
  ctx.textBaseline = "alphabetic";

  return drawYs[0];
}

/** Etiqueta pequeña estilo "chips" (📅 FECHA) fijada arriba de una tarjeta con alineación exacta. */
function drawBandLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  maxWidth: number,
  align: "left" | "center" = "left",
  initialFontSize = 24
): number {
  const label = String(text).toUpperCase();
  let fontSize = initialFontSize;
  ctx.font = `800 ${fontSize}px 'Montserrat', 'Inter', sans-serif`;
  while (fontSize > 12 && ctx.measureText(label).width > maxWidth) {
    fontSize -= 1;
    ctx.font = `800 ${fontSize}px 'Montserrat', 'Inter', sans-serif`;
  }
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  setBlackShadow(ctx, 20, 4, 0.92);
  ctx.fillText(label, x, y);
  ctx.restore();
  ctx.textBaseline = "alphabetic";
  return fontSize;
}

/**
 * LAYOUT 1: split_card (Clásico Asimétrico)
 * Columna izquierda: Logo SPT, badge categoría y título principal.
 * Columna derecha: 3 tarjetas verticales calibradas para la proporción panorámica 20:9.
 */
function renderLayoutSplitCard(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: FlyerRenderData,
  theme: ThemeConfig,
  logoImage?: HTMLImageElement | null
) {
  const pad = 48;
  const innerW = W - pad * 2;
  const rightW = 780;
  const leftX = pad;
  const leftW = innerW - rightW - 44;
  const rightX = W - pad - rightW;

  // ── LOGO SPT (Columna izquierda) ──
  // Altura 175 px → ancho proporcional ~450 px (relación nativa 2.57:1)
  const logoBoxH = 175;
  if (logoImage) drawImageProportional(ctx, logoImage, leftX, pad, leftW, logoBoxH, "center");

  // ── BADGE CATEGORÍA ──
  const badgeH = 56;
  const badgeY = pad + logoBoxH + 16;
  const badgeMaxW = Math.min(leftW, 680);
  const catText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  const badgeW = Math.min(ctx.measureText(catText).width + 60, badgeMaxW);
  ctx.save();
  setBlackShadow(ctx, 40, 10, 0.96);
  roundRect(ctx, leftX + leftW / 2 - badgeW / 2, badgeY, badgeW, badgeH, 28);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, leftX + leftW / 2 - badgeW / 2, badgeY, badgeW, badgeH, 28);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  ctx.fillText(catText, leftX + leftW / 2, badgeY + badgeH / 2);
  ctx.textBaseline = "alphabetic";

  // ── TÍTULO PRINCIPAL (Centrado en el área inferior) ──
  const titleTop = badgeY + badgeH + 16;
  const titleBot = H - pad;
  const titleMaxH = titleBot - titleTop;
  const titleCY = titleTop + titleMaxH / 2;
  const titleFS = 110;
  const tGrad = ctx.createLinearGradient(leftX, titleTop, leftX + leftW, titleTop + Math.min(titleMaxH, 220));
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  fitDrawLines(ctx, data.title || "GRAN TORNEO", leftX + leftW / 2, titleCY, leftW, titleMaxH, 3, "center", titleFS, tGrad, 85);

  // ── COLUMNA DERECHA: 3 TARJETAS VERTICALES ──
  const cardTop = pad;
  const cardBot = H - pad;
  const gap = 16;

  function drawInfoBand(top: number, h: number, label: string, value: string, accent: string, labelColor: string) {
    ctx.save();
    setBlackShadow(ctx, 40, 10, 0.95);
    roundRect(ctx, rightX, top, rightW, h, 20);
    ctx.fillStyle = "rgba(6, 12, 26, 0.88)";
    ctx.fill();
    ctx.restore();
    roundRect(ctx, rightX, top, rightW, h, 20);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const labelY = top + 34;
    drawBandLabel(ctx, label, rightX + rightW / 2, labelY, labelColor, rightW - 60, "center", 24);

    const valueCY = top + 48 + (h - 48) / 2;
    const valueMaxH = h - 64;
    const valueMaxW = rightW - 60;
    fitDrawTwoLines(ctx, value, rightX + rightW / 2, valueCY, valueMaxW, valueMaxH, 58, "#ffffff", 20);
  }

  const s0 = stackSlot(cardTop, cardBot, 3, gap, 0);
  const s1 = stackSlot(cardTop, cardBot, 3, gap, 1);
  const s2 = stackSlot(cardTop, cardBot, 3, gap, 2);
  drawInfoBand(s0.y, s0.h, "📅 FECHA", data.date || "PRÓXIMAMENTE", theme.accentColor, theme.accentColor);
  drawInfoBand(s1.y, s1.h, "📍 LUGAR", data.location || "SALADILLO, B.A.", theme.accentColor, theme.badgeText);
  drawInfoBand(s2.y, s2.h, "🏆 PREMIOS", data.prizes || "TROFEOS + EFECTIVO", "#fbbf24", "#fbbf24");
}

/**
 * LAYOUT 2: hero_center (Impacto Central)
 * Logo central panorámico, badge categoría, título central de alto impacto
 * y 3 podios inferiores horizontales en la base 20:9.
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
  const pad = 48;
  const innerW = W - pad * 2;

  // ── LOGO CENTRAL SUPERIOR ──
  const logoBoxW = 600;
  const logoBoxH = 165;
  if (logoImage) drawImageProportional(ctx, logoImage, cx - logoBoxW / 2, pad, logoBoxW, logoBoxH, "center");

  // ── 3 PODIOS INFERIORES HORIZONTALES (Base panorámica 20:9) ──
  const podioH = 180;
  const podioTop = H - pad - podioH;
  const gap = 20;
  const podioW = (innerW - gap * 2) / 3;

  function drawPodioCard(x: number, y: number, w: number, h: number, label: string, value: string, accent: string, labelColor: string) {
    ctx.save();
    setBlackShadow(ctx, 35, 10, 0.94);
    roundRect(ctx, x, y, w, h, 18);
    ctx.fillStyle = "rgba(6, 12, 26, 0.88)";
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x, y, w, h, 18);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const labelY = y + 30;
    drawBandLabel(ctx, label, x + w / 2, labelY, labelColor, w - 40, "center", 22);

    const valueCY = y + 44 + (h - 44) / 2;
    const valueMaxH = h - 56;
    const valueMaxW = w - 40;
    fitDrawTwoLines(ctx, value, x + w / 2, valueCY, valueMaxW, valueMaxH, 46, "#ffffff", 18);
  }

  // ── BADGE CATEGORÍA centrado bajo el logo ──
  const badgeY = pad + logoBoxH + 14;
  const badgeH = 56;
  const catText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  const catW = Math.min(ctx.measureText(catText).width + 60, 700);
  ctx.save();
  setBlackShadow(ctx, 40, 10, 0.96);
  roundRect(ctx, cx - catW / 2, badgeY, catW, badgeH, 28);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, cx - catW / 2, badgeY, catW, badgeH, 28);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  ctx.fillText(catText, cx, badgeY + badgeH / 2);
  ctx.textBaseline = "alphabetic";

  // ── TÍTULO masivo centrado en el espacio entre badge y podios ──
  const titleTop = badgeY + badgeH + 14;
  const titleBot = podioTop - 18;
  const titleMaxH = titleBot - titleTop;
  const titleCY = titleTop + titleMaxH / 2;
  const titleFS = 115;
  const tGrad = ctx.createLinearGradient(pad, titleCY - titleMaxH / 2, W - pad, titleCY + titleMaxH / 2);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  fitDrawLines(ctx, data.title || "GRAN TORNEO", cx, titleCY, innerW, titleMaxH, 2, "center", titleFS, tGrad, 85);

  const p0X = pad;
  const p1X = pad + podioW + gap;
  const p2X = pad + (podioW + gap) * 2;
  drawPodioCard(p0X, podioTop, podioW, podioH, "📅 FECHA", data.date || "PRÓXIMAMENTE", theme.accentColor, theme.accentColor);
  drawPodioCard(p1X, podioTop, podioW, podioH, "📍 LUGAR", data.location || "SALADILLO, B.A.", theme.accentColor, theme.badgeText);
  drawPodioCard(p2X, podioTop, podioW, podioH, "🏆 PREMIOS", data.prizes || "TROFEOS + EFECTIVO", "#fbbf24", "#fbbf24");
}

/**
 * LAYOUT 3: split_inverted (Invertido Vanguardia)
 * Espejo de split_card: 3 tarjetas verticales a la izquierda,
 * y columna derecha con logo, badge y títulos perfectamente proporcionados.
 */
function renderLayoutSplitInverted(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: FlyerRenderData,
  theme: ThemeConfig,
  logoImage?: HTMLImageElement | null
) {
  const pad = 48;
  const innerW = W - pad * 2;
  const leftW = 780;
  const leftX = pad;
  const rightX = pad + leftW + 44;
  const rightW = innerW - leftW - 44;

  // ── COLUMNA IZQUIERDA: 3 TARJETAS VERTICALES ──
  const cardTop = pad;
  const cardBot = H - pad;
  const gap = 16;

  function drawInfoBand(top: number, h: number, label: string, value: string, accent: string, labelColor: string) {
    ctx.save();
    setBlackShadow(ctx, 40, 10, 0.95);
    roundRect(ctx, leftX, top, leftW, h, 20);
    ctx.fillStyle = "rgba(6, 12, 26, 0.88)";
    ctx.fill();
    ctx.restore();
    roundRect(ctx, leftX, top, leftW, h, 20);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const labelY = top + 34;
    drawBandLabel(ctx, label, leftX + leftW / 2, labelY, labelColor, leftW - 60, "center", 24);

    const valueCY = top + 48 + (h - 48) / 2;
    const valueMaxH = h - 64;
    const valueMaxW = leftW - 60;
    fitDrawTwoLines(ctx, value, leftX + leftW / 2, valueCY, valueMaxW, valueMaxH, 58, "#ffffff", 20);
  }

  const s0 = stackSlot(cardTop, cardBot, 3, gap, 0);
  const s1 = stackSlot(cardTop, cardBot, 3, gap, 1);
  const s2 = stackSlot(cardTop, cardBot, 3, gap, 2);
  drawInfoBand(s0.y, s0.h, "📅 FECHA", data.date || "PRÓXIMAMENTE", theme.accentColor, theme.accentColor);
  drawInfoBand(s1.y, s1.h, "📍 LUGAR", data.location || "SALADILLO, B.A.", theme.accentColor, theme.badgeText);
  drawInfoBand(s2.y, s2.h, "🏆 PREMIOS", data.prizes || "TROFEOS + EFECTIVO", "#fbbf24", "#fbbf24");

  // ── LOGO (Columna derecha) ──
  const logoBoxH = 175;
  if (logoImage) drawImageProportional(ctx, logoImage, rightX, pad, rightW, logoBoxH, "center");

  // ── BADGE CATEGORÍA ──
  const badgeH = 56;
  const badgeY = pad + logoBoxH + 16;
  const badgeMaxW = Math.min(rightW, 680);
  const catText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  const badgeW = Math.min(ctx.measureText(catText).width + 60, badgeMaxW);
  const badgeX = rightX + rightW / 2 - badgeW / 2;
  ctx.save();
  setBlackShadow(ctx, 40, 10, 0.96);
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 28);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 28);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  ctx.fillText(catText, badgeX + badgeW / 2, badgeY + badgeH / 2);
  ctx.textBaseline = "alphabetic";

  // ── TÍTULO (Columna derecha) ──
  const titleTop = badgeY + badgeH + 16;
  const titleBot = H - pad;
  const titleMaxH = titleBot - titleTop;
  const titleCY = titleTop + titleMaxH / 2;
  const titleFS = 110;
  const tGrad = ctx.createLinearGradient(rightX, titleTop, rightX + rightW, titleTop + Math.min(titleMaxH, 220));
  tGrad.addColorStop(0, theme.brandGradient[2]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[0]);
  fitDrawLines(ctx, data.title || "GRAN TORNEO", rightX + rightW / 2, titleCY, rightW, titleMaxH, 3, "center", titleFS, tGrad, 85);
}

/**
 * LAYOUT 4: magazine_bold (Editorial Deportivo)
 * Cinta superior con logo y sello de circuito, badge categoría centrado,
 * titular masivo y 3 podios horizontales en la base 20:9.
 */
function renderLayoutMagazineBold(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: FlyerRenderData,
  theme: ThemeConfig,
  logoImage?: HTMLImageElement | null
) {
  const pad = 48;
  const innerW = W - pad * 2;

  // ── CINTA SUPERIOR PANORÁMICA ──
  const bannerY = pad;
  const bannerH = 90;
  ctx.save();
  setBlackShadow(ctx, 30, 8, 0.9);
  roundRect(ctx, pad, bannerY, innerW, bannerH, 16);
  ctx.fillStyle = "rgba(6, 12, 26, 0.78)";
  ctx.fill();
  ctx.restore();
  roundRect(ctx, pad, bannerY, innerW, bannerH, 16);
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Texto oficial circuito a la izquierda de la cinta
  ctx.save();
  ctx.font = "900 24px 'Montserrat', 'Inter', sans-serif";
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  setBlackShadow(ctx, 20, 4, 0.9);
  ctx.fillText("🏆 SALADILLO PADEL TOUR • CIRCUITO OFICIAL 2026", pad + 32, bannerY + bannerH / 2);
  ctx.restore();

  // Logo derecha de la cinta
  const logoBoxW = 240;
  const logoBoxH = bannerH - 24;
  if (logoImage) drawImageProportional(ctx, logoImage, W - pad - 20 - logoBoxW, bannerY + 12, logoBoxW, logoBoxH, "right");

  // ── 3 PODIOS INFERIORES HORIZONTALES LADO A LADO ──
  const podioH = 180;
  const podioTop = H - pad - podioH;
  const gap = 20;
  const podioW = (innerW - gap * 2) / 3;

  function drawMagPodio(x: number, y: number, w: number, h: number, label: string, value: string, accent: string) {
    ctx.save();
    setBlackShadow(ctx, 35, 10, 0.94);
    roundRect(ctx, x, y, w, h, 18);
    ctx.fillStyle = "rgba(6, 12, 26, 0.88)";
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x, y, w, h, 18);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    const labelY = y + 30;
    drawBandLabel(ctx, label, x + w / 2, labelY, accent, w - 40, "center", 22);

    const valueCY = y + 44 + (h - 44) / 2;
    const valueMaxH = h - 56;
    const valueMaxW = w - 40;
    fitDrawTwoLines(ctx, value, x + w / 2, valueCY, valueMaxW, valueMaxH, 46, "#ffffff", 18);
  }

  // ── BADGE CATEGORÍA ──
  const badgeY = bannerY + bannerH + 16;
  const badgeH = 56;
  const catText = (data.category || "CATEGORÍA ABIERTA").toUpperCase();
  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  const badgeMaxW = 650;
  const badgeW = Math.min(ctx.measureText(catText).width + 60, badgeMaxW);
  ctx.save();
  setBlackShadow(ctx, 40, 10, 0.96);
  roundRect(ctx, pad + innerW / 2 - badgeW / 2, badgeY, badgeW, badgeH, 28);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, pad + innerW / 2 - badgeW / 2, badgeY, badgeW, badgeH, 28);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 30px 'Montserrat', 'Inter', sans-serif";
  ctx.fillText(catText, pad + innerW / 2, badgeY + badgeH / 2);
  ctx.textBaseline = "alphabetic";

  // ── TITULAR EDITORIAL ──
  const titleTop = badgeY + badgeH + 16;
  const titleBot = podioTop - 18;
  const titleMaxH = titleBot - titleTop;
  const titleCY = titleTop + titleMaxH / 2;
  const titleFS = 120;
  const tGrad = ctx.createLinearGradient(pad, titleTop, W - pad, titleTop + Math.min(titleMaxH, 200));
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  fitDrawLines(ctx, data.title || "GRAN TORNEO", pad + innerW / 2, titleCY, innerW, titleMaxH, 2, "center", titleFS, tGrad, 80);

  const p0X = pad;
  const p1X = pad + podioW + gap;
  const p2X = pad + (podioW + gap) * 2;
  drawMagPodio(p0X, podioTop, podioW, podioH, "📅 FECHA", data.date || "PRÓXIMAMENTE", theme.accentColor);
  drawMagPodio(p1X, podioTop, podioW, podioH, "📍 LUGAR", data.location || "SALADILLO, B.A.", theme.badgeText);
  drawMagPodio(p2X, podioTop, podioW, podioH, "🏆 PREMIOS", data.prizes || "TROFEOS + EFECTIVO", "#fbbf24");
}

/**
 * Función principal de renderizado en Canvas (1920x864 - 20:9)
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
  const H = (canvas.height = 864);
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
