import { PrintablePlayerItem, getFormattedPrintDate } from "@/components/ranking/RankingPrintDocument";

export interface RenderRankingFlyerOptions {
  category: string;
  gender: "Caballeros" | "Damas";
  pagePlayers: PrintablePlayerItem[];
  pageIndex: number;
  totalPages: number;
  printDate?: Date;
}

/**
 * Carga una imagen de forma asíncrona devolviendo una promesa
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Dibuja un rectángulo con esquinas redondeadas en Canvas 2D
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill = true,
  stroke = false
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
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/**
 * Renderiza una página del ranking oficial en formato vertical 9:16 (1080 x 1920 px)
 * Optimizado para historias de Instagram, WhatsApp y redes sociales.
 */
export async function renderRankingFlyerToCanvas(
  canvas: HTMLCanvasElement,
  options: RenderRankingFlyerOptions
): Promise<void> {
  const { category, gender, pagePlayers, pageIndex, totalPages, printDate = new Date() } = options;

  const width = 1080;
  const height = 1920;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const isDamas = gender === "Damas";
  const genderLabel = isDamas ? "femenino" : "masculino";
  const brandColor = isDamas ? "#ec4899" : "#10b981";
  const formattedDate = getFormattedPrintDate(printDate);
  const isFirstPage = pageIndex === 0;

  // 1. Fondo Deportivo Premium Oscuro
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#0a0f1d");
  bgGrad.addColorStop(0.5, "#070b14");
  bgGrad.addColorStop(1, "#04070d");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Halos de luz de pádel (Glow)
  const glowTop = ctx.createRadialGradient(900, 150, 0, 900, 150, 500);
  glowTop.addColorStop(0, isDamas ? "rgba(236, 72, 153, 0.25)" : "rgba(16, 185, 129, 0.22)");
  glowTop.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glowTop;
  ctx.fillRect(400, 0, 680, 600);

  const glowBottom = ctx.createRadialGradient(150, 1750, 0, 150, 1750, 600);
  glowBottom.addColorStop(0, isDamas ? "rgba(217, 70, 239, 0.20)" : "rgba(132, 204, 22, 0.18)");
  glowBottom.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glowBottom;
  ctx.fillRect(0, 1200, 700, 720);

  // 3. Líneas vectoriales de cancha de pádel
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 50, width - 100, height - 100);
  ctx.strokeRect(60, 60, width - 120, height - 120);

  let currentY = 70;

  // 4. HEADER: SOLO EN LA PRIMERA PÁGINA (Logo + Leyenda oficial)
  if (isFirstPage) {
    try {
      const logoImg = await loadImage("/LOGOSPT.png");
      const logoHeight = 110;
      const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
      ctx.drawImage(logoImg, 70, currentY, logoWidth, logoHeight);
    } catch {
      // Fallback si no carga imagen
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px sans-serif";
      ctx.fillText("SALADILLO PADEL TOUR", 70, currentY + 60);
    }

    // Badge Circuito Oficial a la derecha
    const badgeW = 310;
    const badgeH = 46;
    const badgeX = width - 70 - badgeW;
    const badgeY = currentY + 20;

    ctx.fillStyle = isDamas ? "rgba(236, 72, 153, 0.18)" : "rgba(16, 185, 129, 0.18)";
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 23, true, false);
    ctx.strokeStyle = brandColor;
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 23, false, true);

    ctx.fillStyle = brandColor;
    ctx.font = "bold 19px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🏆 CIRCUITO OFICIAL SPT", badgeX + badgeW / 2, badgeY + 29);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Tabla Oficial de Puntuación", badgeX + badgeW / 2, badgeY + 72);

    currentY += 135;

    // Línea separadora
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(70, currentY);
    ctx.lineTo(width - 70, currentY);
    ctx.stroke();

    currentY += 45;

    // LEYENDA OFICIAL
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `Ranking de ${category} categoría (${genderLabel}) al día ${formattedDate}`,
      width / 2,
      currentY
    );

    currentY += 40;
  } else {
    // Páginas siguientes: margen superior prolijo
    currentY = 110;
  }

  // 5. ENCABEZADO DE LA TABLA DE COLUMNAS
  const tableX = 60;
  const tableW = width - 120;
  const theadH = 44;

  ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
  drawRoundedRect(ctx, tableX, currentY, tableW, theadH, 12, true, false);
  ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, tableX, currentY, tableW, theadH, 12, false, true);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";

  // Posición
  ctx.fillText("POS.", tableX + 50, currentY + 28);
  // Jugador/a
  ctx.textAlign = "left";
  ctx.fillText("JUGADOR/A (LOCALIDAD)", tableX + 115, currentY + 28);
  // Cat.
  ctx.textAlign = "center";
  ctx.fillText("CAT.", tableX + 580, currentY + 28);
  // Torneos
  ctx.fillText("TORNEOS", tableX + 685, currentY + 28);
  // PG / PP
  ctx.fillText("PG / PP", tableX + 805, currentY + 28);
  // Puntos
  ctx.fillStyle = brandColor;
  ctx.fillText("PUNTOS", tableX + 905, currentY + 28);

  currentY += theadH + 12;

  // 6. 15 FILAS DE JUGADORES
  const rowHeight = isFirstPage ? 88 : 98;
  const rowGap = 8;

  pagePlayers.forEach((player) => {
    const pos = player.position;
    const isTop1 = pos === 1;
    const isTop2 = pos === 2;
    const isTop3 = pos === 3;

    // Fondo de la fila
    ctx.fillStyle = isTop1
      ? "rgba(245, 158, 11, 0.14)"
      : isTop2
      ? "rgba(203, 213, 225, 0.10)"
      : isTop3
      ? "rgba(217, 119, 6, 0.10)"
      : "rgba(15, 23, 42, 0.65)";

    drawRoundedRect(ctx, tableX, currentY, tableW, rowHeight, 14, true, false);

    ctx.strokeStyle = isTop1
      ? "rgba(245, 158, 11, 0.45)"
      : isTop2
      ? "rgba(203, 213, 225, 0.35)"
      : isTop3
      ? "rgba(217, 119, 6, 0.30)"
      : "rgba(30, 41, 59, 0.8)";
    ctx.lineWidth = 1.2;
    drawRoundedRect(ctx, tableX, currentY, tableW, rowHeight, 14, false, true);

    const midRowY = currentY + rowHeight / 2;

    // 1. Círculo de Posición
    const posCircleRadius = 22;
    const posCircleX = tableX + 50;
    const posCircleY = midRowY;

    ctx.beginPath();
    ctx.arc(posCircleX, posCircleY, posCircleRadius, 0, Math.PI * 2);
    ctx.fillStyle = isTop1 ? "#fbbf24" : isTop2 ? "#cbd5e1" : isTop3 ? "#d97706" : "#1e293b";
    ctx.fill();

    ctx.fillStyle = isTop1 || isTop2 ? "#020617" : "#ffffff";
    ctx.font = "900 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(pos), posCircleX, posCircleY + 7);

    // 2. Nombre y Localidad
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    // Truncar si el nombre es demasiado largo
    let displayName = player.name;
    if (displayName.length > 25) {
      displayName = displayName.substring(0, 23) + "…";
    }
    ctx.fillText(displayName, tableX + 115, midRowY + 4);

    const nameWidth = ctx.measureText(displayName).width;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "italic 400 19px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`(${player.localidad || "Saladillo"})`, tableX + 125 + nameWidth, midRowY + 4);

    // 3. Categoría (Badge)
    const catBadgeW = 76;
    const catBadgeH = 34;
    const catBadgeX = tableX + 580 - catBadgeW / 2;
    const catBadgeY = midRowY - catBadgeH / 2;

    ctx.fillStyle = isDamas ? "rgba(236, 72, 153, 0.22)" : "rgba(16, 185, 129, 0.22)";
    drawRoundedRect(ctx, catBadgeX, catBadgeY, catBadgeW, catBadgeH, 8, true, false);
    ctx.strokeStyle = isDamas ? "rgba(236, 72, 153, 0.45)" : "rgba(16, 185, 129, 0.45)";
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, catBadgeX, catBadgeY, catBadgeW, catBadgeH, 8, false, true);

    ctx.fillStyle = brandColor;
    ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(player.category || category, tableX + 580, midRowY + 6);

    // 4. Torneos Jugados
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 23px monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(player.tournaments), tableX + 685, midRowY + 7);

    // 5. PG / PP
    ctx.font = "bold 21px monospace";
    ctx.fillStyle = "#10b981";
    ctx.fillText(String(player.matchesWon), tableX + 785, midRowY + 7);
    ctx.fillStyle = "#64748b";
    ctx.fillText("/", tableX + 805, midRowY + 7);
    ctx.fillStyle = "#f43f5e";
    ctx.fillText(String(player.matchesLost), tableX + 825, midRowY + 7);

    // 6. Puntos
    ctx.fillStyle = brandColor;
    ctx.font = "900 27px monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(player.points), tableX + 905, midRowY + 8);

    currentY += rowHeight + rowGap;
  });

  // 7. FOOTER
  const footerY = height - 70;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(60, footerY);
  ctx.lineTo(width - 60, footerY);
  ctx.stroke();

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Saladillo Padel Tour • www.saladinopadeltour.com.ar", 60, footerY + 34);

  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 19px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(`PÁGINA ${pageIndex + 1} DE ${totalPages}`, width - 60, footerY + 34);
}
