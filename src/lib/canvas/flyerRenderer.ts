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
 * Dibuja un bloque de hasta 2 líneas escalando la fuente para que entre 100%
 * dentro del rectángulo (maxW × maxH), centrado verticalmente en centerY.
 * Devuelve el tamaño de fuente usado. Usado para máximos de ancho y alto.
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

  return drawYs[drawYs.length - 1] + lh / 2;
}

/** Etiqueta pequeña estilo "chips" (📅 FECHA) fijada arriba de una banda. */
function drawBandLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  maxWidth: number,
  align: "left" | "center" = "left"
): number {
  const label = String(text).toUpperCase();
  let fontSize = 22;
  ctx.font = `700 ${fontSize}px 'Inter', sans-serif`;
  while (fontSize > 12 && ctx.measureText(label).width > maxWidth) {
    fontSize -= 1;
    ctx.font = `700 ${fontSize}px 'Inter', sans-serif`;
  }
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(label, x, y);
  return fontSize;
}

/**
 * LAYOUT 1: split_card (Clásico Asimétrico)
 * Columna izquierda: logo + badge categoría + título.
 * Columna derecha: 3 bandas (fecha/lugar/premios) que llenan desde pad hasta H-pad,
 * alineadas y simétricas. Todo dentro del lienzo (0..1920 × 0..1080) con margen `pad`.
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
  const innerW = W - pad * 2;
  // Card derecha ocupa 46% (883) — simétrica verticalmente, margen inferior = pad.
  const rightW = 900;
  const leftX = pad;
  const leftW = innerW - rightW - 40;
  const rightX = W - pad - rightW;

  // Logo
  const logoBoxH = 240;
  if (logoImage) drawImageProportional(ctx, logoImage, leftX, pad, leftW, logoBoxH, "left");

  // Badge categoría (más grande y visible, centrado arriba del título)
  const badgeH = 88;
  const badgeY = pad + logoBoxH + 30;
  const badgeMaxW = Math.min(leftW, 720);
  const catText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 44px 'Montserrat', 'Inter', sans-serif";
  const badgeW = Math.min(ctx.measureText(catText).width + 72, badgeMaxW);
  ctx.save();
  setBlackShadow(ctx, 45, 14, 0.97);
  roundRect(ctx, leftX + leftW / 2 - badgeW / 2, badgeY, badgeW, badgeH, 36);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, leftX + leftW / 2 - badgeW / 2, badgeY, badgeW, badgeH, 36);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 44px 'Montserrat', 'Inter', sans-serif";
  ctx.fillText(catText, leftX + leftW / 2, badgeY + badgeH / 2);
  ctx.textBaseline = "alphabetic";

  // Título principal (escala a 3 líneas máx dentro del espacio libre)
  const titleTop = badgeY + badgeH + 50;
  const titleMaxH = H - pad - titleTop;
  const tGrad = ctx.createLinearGradient(leftX, titleTop, leftX + leftW, titleTop + Math.min(titleMaxH, 260));
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  fitDrawLines(ctx, data.title || "GRAN TORNEO", leftX + leftW / 2, titleTop + titleMaxH / 2, leftW, titleMaxH, 3, "center", 130, tGrad, 90);

  // Card fondo (3 bandas que llenan verticalmente de pad a H-pad)
  const cardTop = pad;
  const cardBot = H - pad;
  const gap = 22;

  function drawInfoBand(top: number, h: number, label: string, value: string, accent: string, labelColor: string) {
    ctx.save();
    setBlackShadow(ctx, 45, 12, 0.95);
    roundRect(ctx, rightX, top, rightW, h, 26);
    ctx.fillStyle = "rgba(6, 12, 26, 0.86)";
    ctx.fill();
    ctx.restore();
    roundRect(ctx, rightX, top, rightW, h, 26);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    drawBandLabel(ctx, label, rightX + rightW / 2, top + 44, labelColor, rightW - 68, "center");
    const valueMaxW = rightW - 68;
    const valueTop = top + 62;
    const valueH = h - 78;
    fitDrawLines(ctx, value, rightX + rightW / 2, valueTop + valueH / 2, valueMaxW, valueH, 2, "center", 66, "#ffffff", 20);
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
 * Logo centrado arriba, badge categoría, título masivo y 3 columnas (fecha/lugar/premios).
 * Balance vertical exacto: margen superior = margen inferior = pad. Nada desborda 0..1920 × 0..1080.
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
  const pad = 60;
  const innerW = W - pad * 2;

  // ── LOGO CENTRAL SUPERIOR (35% del ancho) ──
  const logoBoxW = 672;
  const logoBoxH = 200;
  if (logoImage) drawImageProportional(ctx, logoImage, cx - logoBoxW / 2, pad, logoBoxW, logoBoxH, "center");

  // ── BADGE CATEGORÍA más grande y visible, centrado bajo el logo ──
  const badgeH = 84;
  const badgeY = pad + logoBoxH + 18;
  const catText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 42px 'Montserrat', 'Inter', sans-serif";
  const catW = Math.min(ctx.measureText(catText).width + 72, 820);
  ctx.save();
  setBlackShadow(ctx, 45, 14, 0.97);
  roundRect(ctx, cx - catW / 2, badgeY, catW, badgeH, 34);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, cx - catW / 2, badgeY, catW, badgeH, 34);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 42px 'Montserrat', 'Inter', sans-serif";
  ctx.fillText(catText, cx, badgeY + badgeH / 2);
  ctx.textBaseline = "alphabetic";

  // ── 3 BANDAS DE ANCHO COMPLETO, rellenan exactamente hasta H-pad (simetría) ──
  const bandsH = 430;
  const bandsTop = H - pad - bandsH;
  const bandX = pad;
  const bandW = innerW;
  const gap = 20;

  // ── TÍTULO masivo centrado entre el badge y las bandas ──
  const titleTop = badgeY + badgeH + 38;
  const titleMaxW = innerW;
  const titleMaxH = bandsTop - 40 - titleTop;
  const titleCY = titleTop + titleMaxH / 2;
  const tGrad = ctx.createLinearGradient(pad, titleCY - titleMaxH / 2, W - pad, titleCY + titleMaxH / 2);
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  fitDrawLines(ctx, data.title || "GRAN TORNEO", cx, titleCY, titleMaxW, titleMaxH, 2, "center", 150, tGrad, 90);

  function drawFullBand(top: number, h: number, label: string, value: string, accent: string) {
    ctx.save();
    setBlackShadow(ctx, 45, 12, 0.95);
    roundRect(ctx, bandX, top, bandW, h, 22);
    ctx.fillStyle = "rgba(6, 12, 26, 0.86)";
    ctx.fill();
    ctx.restore();
    roundRect(ctx, bandX, top, bandW, h, 22);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    drawBandLabel(ctx, label, cx, top + 42, accent, bandW - 52, "center");
    const vTop = top + 56;
    const vH = h - 56 - 18;
    fitDrawLines(ctx, value, cx, vTop + vH / 2, bandW - 52, vH, 2, "center", 62, "#ffffff", 20);
  }

  const b0 = stackSlot(bandsTop, H - pad, 3, gap, 0);
  const b1 = stackSlot(bandsTop, H - pad, 3, gap, 1);
  const b2 = stackSlot(bandsTop, H - pad, 3, gap, 2);
  drawFullBand(b0.y, b0.h, "📅 FECHA", data.date || "PRÓXIMAMENTE", theme.accentColor);
  drawFullBand(b1.y, b1.h, "📍 LUGAR", data.location || "SALADILLO, B.A.", theme.badgeText);
  drawFullBand(b2.y, b2.h, "🏆 PREMIOS", data.prizes || "TROFEOS + EFECTIVO", "#fbbf24");
}

/**
 * LAYOUT 3: split_inverted (Invertido Vanguardia)
 * Espejo exacto de split_card: card de 3 bandas a la IZQUIERDA llenando de
 * pad a H-pad (simetría vertical), columna derecha logo + badge + título.
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
  const innerW = W - pad * 2;
  const leftW = 900;
  const leftX = pad;
  const rightX = pad + leftW + 40;
  const rightW = W - pad - rightX;

  // Logo alineado a la derecha
  const logoBoxH = 240;
  if (logoImage) drawImageProportional(ctx, logoImage, rightX, pad, rightW, logoBoxH, "right");

  // Badge categoría más grande y visible, centrado arriba del título
  const badgeH = 88;
  const badgeY = pad + logoBoxH + 30;
  const badgeMaxW = Math.min(rightW, 720);
  const catText = (data.category || "TORNEO OFICIAL").toUpperCase();
  ctx.font = "900 44px 'Montserrat', 'Inter', sans-serif";
  const badgeW = Math.min(ctx.measureText(catText).width + 72, badgeMaxW);
  const badgeX = rightX + rightW / 2 - badgeW / 2;
  ctx.save();
  setBlackShadow(ctx, 45, 14, 0.97);
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 36);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 36);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 44px 'Montserrat', 'Inter', sans-serif";
  ctx.fillText(catText, badgeX + badgeW / 2, badgeY + badgeH / 2);
  ctx.textBaseline = "alphabetic";

  // Título alineado a la derecha
  const titleTop = badgeY + badgeH + 50;
  const titleMaxH = H - pad - titleTop;
  const tGrad = ctx.createLinearGradient(rightX, titleTop, rightX + rightW, titleTop + Math.min(titleMaxH, 260));
  tGrad.addColorStop(0, theme.brandGradient[2]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[0]);
  fitDrawLines(ctx, data.title || "GRAN TORNEO", rightX + rightW / 2, titleTop + titleMaxH / 2, rightW, titleMaxH, 3, "center", 130, tGrad, 65);

  // 3 bandas a la izquierda, simetría vertical exacta
  const cardTop = pad;
  const cardBot = H - pad;
  const gap = 22;

  function drawInfoBand(top: number, h: number, label: string, value: string, accent: string, labelColor: string) {
    ctx.save();
    setBlackShadow(ctx, 45, 12, 0.95);
    roundRect(ctx, leftX, top, leftW, h, 26);
    ctx.fillStyle = "rgba(6, 12, 26, 0.86)";
    ctx.fill();
    ctx.restore();
    roundRect(ctx, leftX, top, leftW, h, 26);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    drawBandLabel(ctx, label, leftX + leftW / 2, top + 44, labelColor, leftW - 68, "center");
    const valueTop = top + 62;
    const valueH = h - 78;
    fitDrawLines(ctx, value, leftX + leftW / 2, valueTop + valueH / 2, leftW - 68, valueH, 2, "center", 66, "#ffffff", 20);
  }

  const s0 = stackSlot(cardTop, cardBot, 3, gap, 0);
  const s1 = stackSlot(cardTop, cardBot, 3, gap, 1);
  const s2 = stackSlot(cardTop, cardBot, 3, gap, 2);
  drawInfoBand(s0.y, s0.h, "📅 FECHA", data.date || "PRÓXIMAMENTE", theme.accentColor, theme.accentColor);
  drawInfoBand(s1.y, s1.h, "📍 LUGAR", data.location || "SALADILLO, B.A.", theme.accentColor, theme.badgeText);
  drawInfoBand(s2.y, s2.h, "🏆 PREMIOS", data.prizes || "TROFEOS + EFECTIVO", "#fbbf24", "#fbbf24");
}

/**
 * LAYOUT 4: magazine_bold (Editorial Deportivo)
 * Cinta superior (badge categoría izquierda + logo derecha), titular masivo
 * alineado a la izquierda y 3 bandas de datos que cierran exactamente en H-pad.
 * Todo dentro de 0..1920 × 0..1080 (margen pad en los 4 bordes → simetría).
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
  const innerW = W - pad * 2;

  // ── CINTA SUPERIOR ──
  const bannerY = pad;
  const bannerH = 130;
  ctx.save();
  setBlackShadow(ctx, 35, 8, 0.9);
  roundRect(ctx, pad, bannerY, innerW, bannerH, 18);
  ctx.fillStyle = "rgba(6, 12, 26, 0.75)";
  ctx.fill();
  ctx.restore();
  roundRect(ctx, pad, bannerY, innerW, bannerH, 18);
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Badge categoría más grande y visible, centrado arriba del título
  const catText = (data.category || "CATEGORÍA ABIERTA").toUpperCase();
  const badgeH = 92;
  const badgeY = bannerY + (bannerH - badgeH) / 2;
  ctx.font = "900 46px 'Montserrat', 'Inter', sans-serif";
  const badgeMaxW = 700;
  const badgeW = Math.min(ctx.measureText(catText).width + 76, badgeMaxW);
  ctx.save();
  setBlackShadow(ctx, 45, 14, 0.97);
  roundRect(ctx, pad + 30, badgeY, badgeW, badgeH, 40);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, pad + 30, badgeY, badgeW, badgeH, 40);
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 46px 'Montserrat', 'Inter', sans-serif";
  ctx.fillText(catText, pad + 30 + badgeW / 2, badgeY + badgeH / 2);
  ctx.textBaseline = "alphabetic";

  // Logo derecha de la cinta (respetando aspect ratio, nunca deformado)
  const logoBoxW = 700;
  const logoBoxH = bannerH - 32;
  if (logoImage) drawImageProportional(ctx, logoImage, W - pad - 30 - logoBoxW, bannerY + 16, logoBoxW, logoBoxH, "right");

  // ── 3 BANDAS INFERIORES que terminan exactamente en H-pad ──
  const bandsGap = 20;
  const bandsH = 470;
  const bandsBot = H - pad;
  const bandsTop = bandsBot - bandsH;

  // ── TITULAR EDITORIAL masivo, centrado ──
  const titleTop = bannerY + bannerH + 34;
  const titleMaxW = innerW;
  const titleMaxH = bandsTop - 34 - titleTop;
  const tGrad = ctx.createLinearGradient(pad, titleTop, W - pad, titleTop + Math.min(titleMaxH, 220));
  tGrad.addColorStop(0, theme.brandGradient[0]);
  tGrad.addColorStop(0.5, theme.brandGradient[1]);
  tGrad.addColorStop(1, theme.brandGradient[2]);
  fitDrawLines(ctx, data.title || "GRAN TORNEO", pad + innerW / 2, titleTop + titleMaxH / 2, titleMaxW, titleMaxH, 2, "center", 142, tGrad, 75);

  function drawMagBand(top: number, h: number, label: string, value: string, accent: string) {
    ctx.save();
    setBlackShadow(ctx, 40, 10, 0.94);
    roundRect(ctx, pad, top, innerW, h, 20);
    ctx.fillStyle = "rgba(6, 12, 26, 0.85)";
    ctx.fill();
    ctx.restore();
    roundRect(ctx, pad, top, innerW, h, 20);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    drawBandLabel(ctx, label, pad + innerW / 2, top + 38, accent, innerW - 72, "center");
    const vTop = top + 54;
    const vH = h - 54 - 22;
    fitDrawLines(ctx, value, pad + innerW / 2, vTop + vH / 2, innerW - 72, vH, 1, "center", 62, "#ffffff", 20);
  }

  const m0 = stackSlot(bandsTop, bandsBot, 3, bandsGap, 0);
  const m1 = stackSlot(bandsTop, bandsBot, 3, bandsGap, 1);
  const m2 = stackSlot(bandsTop, bandsBot, 3, bandsGap, 2);
  drawMagBand(m0.y, m0.h, "📅 FECHA", data.date || "PRÓXIMAMENTE", theme.accentColor);
  drawMagBand(m1.y, m1.h, "📍 LUGAR", data.location || "SALADILLO, B.A.", theme.badgeText);
  drawMagBand(m2.y, m2.h, "🏆 PREMIOS", data.prizes || "TROFEOS + EFECTIVO", "#fbbf24");
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
