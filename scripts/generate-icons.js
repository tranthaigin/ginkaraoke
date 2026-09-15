import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  const bytesPerPixel = 4;
  const rowSize = width * bytesPerPixel;
  const rawData = Buffer.alloc((rowSize + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowSize + 1);
    rawData[rowStart] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelStart = rowStart + 1 + x * bytesPerPixel;
      rawData[pixelStart] = r;
      rawData[pixelStart + 1] = g;
      rawData[pixelStart + 2] = b;
      rawData[pixelStart + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);

    const toCrc = Buffer.concat([typeBuf, data]);
    const crcVal = crc32(toCrc);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);

    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function karaokeIconRenderer(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const radius = w * 0.44;

  // Background rounded circle gradient (Dark violet to deep midnight)
  if (dist > radius) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Gradient background
  const t = (x + y) / (w + h);
  let r = Math.round(15 + t * 25);
  let g = Math.round(23 + t * 10);
  let b = Math.round(42 + t * 60);

  // Border glow (Cyan / Purple neon)
  if (dist > radius - 6) {
    return [168, 85, 247, 255]; // Purple neon glow
  }

  // Draw Microphone shape in the center
  // Mic head: circle at (cx, cy - h*0.12), radius ~ w*0.16
  const micHeadDist = Math.sqrt(dx * dx + (y - (cy - h * 0.1)) * (y - (cy - h * 0.1)));
  if (micHeadDist < w * 0.15) {
    return [6, 182, 212, 255]; // Cyan neon mic head
  }

  // Mic handle: trapezoid / rect
  if (Math.abs(dx) < w * 0.08 && y >= cy - h * 0.05 && y <= cy + h * 0.22) {
    return [168, 85, 247, 255]; // Purple handle
  }

  // Musical note / star dot nearby
  const noteDist = Math.sqrt((x - (cx + w * 0.22)) * (x - (cx + w * 0.22)) + (y - (cy - h * 0.22)) * (y - (cy - h * 0.22)));
  if (noteDist < w * 0.06) {
    return [245, 158, 11, 255]; // Amber star
  }

  return [r, g, b, 255];
}

fs.writeFileSync('public/pwa-192x192.png', createPNG(192, 192, karaokeIconRenderer));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512, 512, karaokeIconRenderer));
console.log('Successfully generated PWA icons.');
