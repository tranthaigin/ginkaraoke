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

function brandLogoRenderer(x, y, w, h) {
  // Normalized coordinates (0 to 100)
  const nx = (x / w) * 100;
  const ny = (y / h) * 100;
  const dx = nx - 50;
  const dy = ny - 50;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Outside outer boundary -> transparent
  if (dist > 48) {
    return [0, 0, 0, 0];
  }

  // Outer glowing neon ring: r between 42 and 46
  if (dist >= 42.5 && dist <= 46.5) {
    // Gradient around perimeter: cyan (left) -> violet (top/bottom) -> pink/magenta (right)
    const angle = Math.atan2(dy, dx); // -PI to PI
    const t = (angle + Math.PI) / (2 * Math.PI);
    if (t < 0.4) return [0, 242, 254, 255]; // Cyan
    if (t < 0.75) return [168, 85, 247, 255]; // Violet
    return [236, 72, 153, 255]; // Magenta
  }

  // Base background (Deep Midnight / Dark Navy)
  let r = 7;
  let g = 11;
  let b = 22;

  // Musical note floating at top right (nx ~ 72, ny ~ 22)
  const noteHeadDist = Math.hypot(nx - 71, ny - 28);
  if (noteHeadDist <= 4.5) return [244, 63, 94, 255]; // Magenta note head
  if (nx >= 73.5 && nx <= 76.5 && ny >= 15 && ny <= 28) return [245, 158, 11, 255]; // Amber stem
  if (nx >= 75 && nx <= 82 && ny >= 15 && ny <= 20) return [245, 158, 11, 255]; // Amber flag

  // Microphone head at top of stem (nx ~ 30, ny ~ 27)
  const micHeadDist = Math.hypot(nx - 30, ny - 27);
  if (micHeadDist <= 8.5) {
    if (Math.abs(ny - 27) <= 1.2 || Math.abs(ny - 24) <= 1.2 || Math.abs(ny - 30) <= 1.2) {
      return [255, 255, 255, 240]; // Grille line
    }
    return [34, 211, 238, 255]; // Cyan mic head
  }

  // Left vertical stem of letter K (nx between 25.5 and 34.5, ny between 30 and 74)
  if (nx >= 25.5 && nx <= 34.5 && ny >= 28 && ny <= 74) {
    // Gradient from sky blue to violet
    const t = (ny - 28) / 46;
    return [Math.round(56 + t * 136), Math.round(189 - t * 57), Math.round(248 + t * 4), 255];
  }

  // Upper diagonal of K (from 35, 49 to 63, 28)
  const line1Dist = Math.abs((28 - 49) * nx - (63 - 35) * ny + 63 * 49 - 28 * 35) / Math.hypot(28 - 49, 63 - 35);
  if (line1Dist <= 4.8 && nx >= 33 && nx <= 64 && ny >= 26 && ny <= 51) {
    return [0, 242, 254, 255]; // Cyan neon branch
  }

  // Lower diagonal of K (from 35, 49 to 64, 76)
  const line2Dist = Math.abs((76 - 49) * nx - (64 - 35) * ny + 64 * 49 - 76 * 35) / Math.hypot(76 - 49, 64 - 35);
  if (line2Dist <= 4.8 && nx >= 33 && nx <= 65 && ny >= 46 && ny <= 77) {
    return [168, 85, 247, 255]; // Violet neon branch
  }

  // Central neon node (nx ~ 37, ny ~ 49)
  const nodeDist = Math.hypot(nx - 37, ny - 49);
  if (nodeDist <= 5) {
    return [0, 242, 254, 255];
  }

  return [r, g, b, 255];
}

fs.writeFileSync('public/pwa-192x192.png', createPNG(192, 192, brandLogoRenderer));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512, 512, brandLogoRenderer));
console.log('Successfully generated branded PWA icons.');
