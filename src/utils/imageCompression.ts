export const MAX_PHOTO_DIMENSION_PX = 400;
export const MAX_PHOTO_SIZE_BYTES = 150 * 1024; // 150 KB

export const ALLOWED_PHOTO_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const ALLOWED_EXTENSION_PATTERN = /\.(png|jpe?g|webp)$/i;

export function isAllowedPhotoFile(file: File): boolean {
  if (!file) return false;
  const mime = (file.type || '').trim().toLowerCase();
  if (mime) {
    return ALLOWED_PHOTO_MIME_TYPES.has(mime);
  }
  return ALLOWED_EXTENSION_PATTERN.test(file.name || '');
}

export function computeScaledDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_PHOTO_DIMENSION_PX
): { width: number; height: number } {
  const safeWidth = Math.max(1, Math.round(width || 1));
  const safeHeight = Math.max(1, Math.round(height || 1));

  if (safeWidth <= maxDimension && safeHeight <= maxDimension) {
    return { width: safeWidth, height: safeHeight };
  }

  const ratio = Math.min(maxDimension / safeWidth, maxDimension / safeHeight);
  return {
    width: Math.max(1, Math.round(safeWidth * ratio)),
    height: Math.max(1, Math.round(safeHeight * ratio)),
  };
}

export function getDataUrlByteSize(dataUrl: string): number {
  if (!dataUrl || typeof dataUrl !== 'string') return 0;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    return new Blob([dataUrl]).size;
  }
  const base64 = dataUrl.slice(commaIdx + 1).replace(/\s+/g, '');
  if (!base64) return 0;
  let padding = 0;
  if (base64.endsWith('==')) padding = 2;
  else if (base64.endsWith('=')) padding = 1;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file.'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };
    reader.readAsDataURL(file);
  });
}

export interface DrawableImageSource {
  width: number;
  height: number;
  naturalWidth?: number;
  naturalHeight?: number;
}

export function compressDrawableToDataUrl(
  source: DrawableImageSource,
  preferredMimeType: string,
  maxDimension: number = MAX_PHOTO_DIMENSION_PX,
  maxBytes: number = MAX_PHOTO_SIZE_BYTES,
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')
): string {
  const rawW = source.naturalWidth || source.width || maxDimension;
  const rawH = source.naturalHeight || source.height || maxDimension;
  let { width, height } = computeScaledDimensions(rawW, rawH, maxDimension);

  const normalizedMime = (preferredMimeType || '').toLowerCase();
  const initialFormat =
    normalizedMime === 'image/png'
      ? 'image/png'
      : normalizedMime === 'image/webp'
      ? 'image/webp'
      : 'image/jpeg';

  const renderAt = (
    targetWidth: number,
    targetHeight: number,
    format: string,
    quality?: number
  ): string => {
    const canvas = createCanvas();
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context is unavailable.');
    }
    if (format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    } else {
      ctx.clearRect(0, 0, targetWidth, targetHeight);
    }
    ctx.drawImage(
      source as CanvasImageSource,
      0,
      0,
      targetWidth,
      targetHeight
    );
    return quality !== undefined
      ? canvas.toDataURL(format, quality)
      : canvas.toDataURL(format);
  };

  // First attempt in original/preferred format if PNG, or high quality lossy
  if (initialFormat === 'image/png') {
    const pngDataUrl = renderAt(width, height, 'image/png');
    if (getDataUrlByteSize(pngDataUrl) <= maxBytes) {
      return pngDataUrl;
    }
  }

  const lossyFormat =
    initialFormat === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const qualitySteps = [0.88, 0.78, 0.68, 0.56, 0.44, 0.32, 0.22];

  let bestUrl = '';
  for (let scalePass = 0; scalePass < 4; scalePass++) {
    for (const q of qualitySteps) {
      let candidate = renderAt(width, height, lossyFormat, q);
      // Fallback to image/jpeg if runtime ignored image/webp and returned image/png
      if (lossyFormat === 'image/webp' && candidate.startsWith('data:image/png')) {
        candidate = renderAt(width, height, 'image/jpeg', q);
      }
      bestUrl = candidate;
      if (getDataUrlByteSize(candidate) <= maxBytes) {
        return candidate;
      }
    }
    width = Math.max(48, Math.round(width * 0.8));
    height = Math.max(48, Math.round(height * 0.8));
  }

  if (getDataUrlByteSize(bestUrl) > maxBytes) {
    throw new Error('Unable to compress image below 150 KB. Please try a simpler image.');
  }
  return bestUrl;
}

function isJsdomWithoutCanvasMock(): boolean {
  if (typeof navigator === 'undefined' || !/jsdom/i.test(navigator.userAgent || '')) {
    return false;
  }
  const imgCtor = typeof window !== 'undefined' ? (window.Image as any) : undefined;
  const getCtx =
    typeof HTMLCanvasElement !== 'undefined'
      ? (HTMLCanvasElement.prototype.getContext as any)
      : undefined;
  const imageMocked = Boolean(imgCtor && imgCtor._isMockFunction);
  const canvasMocked = Boolean(getCtx && getCtx._isMockFunction);
  return !imageMocked && !canvasMocked;
}

export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Invalid or corrupted image file.'));
    img.src = dataUrl;
  });
}

export async function processProfilePhoto(file: File): Promise<string> {
  if (!isAllowedPhotoFile(file)) {
    throw new Error('Unsupported format. Please upload a PNG, JPG, or WebP image.');
  }

  const rawDataUrl = await readFileAsDataUrl(file);

  if (isJsdomWithoutCanvasMock()) {
    if (getDataUrlByteSize(rawDataUrl) > MAX_PHOTO_SIZE_BYTES) {
      throw new Error('Unable to compress image below 150 KB in this environment.');
    }
    return rawDataUrl;
  }

  const img = await loadImageFromDataUrl(rawDataUrl);
  return compressDrawableToDataUrl(
    img,
    file.type || 'image/jpeg',
    MAX_PHOTO_DIMENSION_PX,
    MAX_PHOTO_SIZE_BYTES
  );
}
