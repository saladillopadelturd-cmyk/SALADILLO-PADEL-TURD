const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function makePng(width, height, pixelFn) {
  // 1. Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // 2. IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA (color type 6)
  ihdrData.writeUInt8(0, 10); // deflate
  ihdrData.writeUInt8(0, 11); // no filter
  ihdrData.writeUInt8(0, 12); // non-interlaced

  const ihdrChunk = makeChunk("IHDR", ihdrData);

  // 3. IDAT Chunk (raw scanlines)
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData.writeUInt8(0, rowOffset); // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData.writeUInt8(r, pxOffset);
      rawData.writeUInt8(g, pxOffset + 1);
      rawData.writeUInt8(b, pxOffset + 2);
      rawData.writeUInt8(a, pxOffset + 3);
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk("IDAT", compressedData);

  // 4. IEND Chunk
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = data.length;
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(len, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = zlib.crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal >>> 0, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Pixel generator for athletic SPT icon
function sptPixelGenerator(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;

  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background rounded rectangle
  const cornerRadius = w * 0.22;
  const inX = Math.abs(x - cx) < cx - cornerRadius;
  const inY = Math.abs(y - cy) < cy - cornerRadius;
  let inBackground = false;

  if (inX || inY) {
    if (Math.abs(x - cx) <= cx && Math.abs(y - cy) <= cy) inBackground = true;
  } else {
    const cornerDx = Math.abs(x - cx) - (cx - cornerRadius);
    const cornerDy = Math.abs(y - cy) - (cy - cornerRadius);
    if (cornerDx * cornerDx + cornerDy * cornerDy <= cornerRadius * cornerRadius) {
      inBackground = true;
    }
  }

  if (!inBackground) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Base gradient: deep athletic slate (#0f172a to #020617)
  const gradT = (x + y) / (w + h);
  let r = Math.round(15 * (1 - gradT) + 2 * gradT);
  let g = Math.round(23 * (1 - gradT) + 6 * gradT);
  let b = Math.round(42 * (1 - gradT) + 23 * gradT);
  let a = 255;

  // Outer glowing ring: emerald green (#10b981) to electric blue (#3b82f6)
  const ringWidth = w * 0.035;
  const ringRadius = w * 0.38;
  const ringDist = Math.abs(dist - ringRadius);
  if (ringDist < ringWidth) {
    const ringT = (x / w);
    const ringR = Math.round(16 * (1 - ringT) + 59 * ringT);
    const ringG = Math.round(185 * (1 - ringT) + 130 * ringT);
    const ringB = Math.round(129 * (1 - ringT) + 246 * ringT);
    const alphaFactor = 1 - ringDist / ringWidth;
    r = Math.round(r * (1 - alphaFactor) + ringR * alphaFactor);
    g = Math.round(g * (1 - alphaFactor) + ringG * alphaFactor);
    b = Math.round(b * (1 - alphaFactor) + ringB * alphaFactor);
  }

  // Padel ball / circle in the center: vibrant neon lime (#84cc16 / #a3e635)
  const ballRadius = w * 0.24;
  const ballDist = Math.sqrt(dx * dx + dy * dy);
  if (ballDist <= ballRadius) {
    // 3D sphere gradient lighting (light source at top-left)
    const lightDist = Math.sqrt((dx + ballRadius * 0.3) ** 2 + (dy + ballRadius * 0.3) ** 2);
    const lightFactor = Math.max(0, 1 - lightDist / (ballRadius * 1.6));

    let br = Math.round(132 + 50 * lightFactor);
    let bg = Math.round(204 + 40 * lightFactor);
    let bb = Math.round(22 + 30 * lightFactor);

    // Ball seam curve (classic padel/tennis curved lines)
    const seamDist1 = Math.abs(Math.sin((dx - dy) / (ballRadius * 0.7)) * ballRadius * 0.5 - (dx + dy) * 0.35);
    const seamDist2 = Math.abs(Math.sin((dx + dy) / (ballRadius * 0.7)) * ballRadius * 0.5 - (dx - dy) * 0.35);
    const isSeam = seamDist1 < (w * 0.015) || seamDist2 < (w * 0.015);
    if (isSeam) {
      br = 255;
      bg = 255;
      bb = 255;
    }

    // Anti-aliasing at the edge of the ball
    const edgeDist = ballRadius - ballDist;
    if (edgeDist < 1.5) {
      const edgeAlpha = Math.max(0, Math.min(1, edgeDist / 1.5));
      r = Math.round(r * (1 - edgeAlpha) + br * edgeAlpha);
      g = Math.round(g * (1 - edgeAlpha) + bg * edgeAlpha);
      b = Math.round(b * (1 - edgeAlpha) + bb * edgeAlpha);
    } else {
      r = br;
      g = bg;
      b = bb;
    }
  }

  return [r, g, b, a];
}

const publicDir = path.join(__dirname, "..", "public");

console.log("Generating 192x192 PNG...");
const png192 = makePng(192, 192, sptPixelGenerator);
fs.writeFileSync(path.join(publicDir, "icon-192x192.png"), png192);

console.log("Generating 512x512 PNG...");
const png512 = makePng(512, 512, sptPixelGenerator);
fs.writeFileSync(path.join(publicDir, "icon-512x512.png"), png512);

console.log("Icons generated successfully! Sizes:", png192.length, "bytes and", png512.length, "bytes.");
