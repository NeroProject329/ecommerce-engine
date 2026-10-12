import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { validateImageCandidate } from './index';

const signatures: ReadonlyArray<{ mimeType: string; matches: (value: Uint8Array) => boolean }> = [
  { mimeType: 'image/jpeg', matches: (value) => value[0] === 0xff && value[1] === 0xd8 && value[2] === 0xff },
  { mimeType: 'image/png', matches: (value) => value.slice(0, 8).every((byte, index) => byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]) },
  { mimeType: 'image/webp', matches: (value) => Buffer.from(value.slice(0, 4)).toString() === 'RIFF' && Buffer.from(value.slice(8, 12)).toString() === 'WEBP' },
  { mimeType: 'image/avif', matches: (value) => Buffer.from(value.slice(4, 12)).toString().includes('ftypavif') },
];

export function detectImageMimeType(body: Uint8Array): string {
  const match = signatures.find((candidate) => candidate.matches(body));
  if (!match) throw new Error('MEDIA_SIGNATURE_INVALID');
  validateImageCandidate({ mimeType: match.mimeType, bytes: body.byteLength });
  return match.mimeType;
}

export function imageSha256(body: Uint8Array): string {
  return createHash('sha256').update(body).digest('hex');
}

export interface OptimizedImage {
  width: number;
  height: number;
  originalMimeType: string;
  rendition: Uint8Array;
  renditionMimeType: 'image/webp';
  renditionWidth: number;
  renditionHeight: number;
}

export async function optimizeImage(body: Uint8Array, maximumDimension = 1600): Promise<OptimizedImage> {
  const originalMimeType = detectImageMimeType(body);
  const pipeline = sharp(body, { failOn: 'warning', limitInputPixels: 40_000_000 }).rotate();
  const metadata = await pipeline.metadata();
  if (!metadata.width || !metadata.height) throw new Error('MEDIA_DIMENSIONS_INVALID');
  const rendition = await pipeline
    .resize({ width: maximumDimension, height: maximumDimension, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  if (!rendition.info.width || !rendition.info.height) throw new Error('MEDIA_RENDITION_INVALID');
  return {
    width: metadata.width,
    height: metadata.height,
    originalMimeType,
    rendition: rendition.data,
    renditionMimeType: 'image/webp',
    renditionWidth: rendition.info.width,
    renditionHeight: rendition.info.height,
  };
}
