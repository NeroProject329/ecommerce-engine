export const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export interface MediaCandidate {
  mimeType: string;
  bytes: number;
}

export function validateImageCandidate(
  candidate: MediaCandidate,
  maximumBytes = 10 * 1024 * 1024,
): void {
  if (!allowedImageMimeTypes.has(candidate.mimeType)) {
    throw new Error('MEDIA_TYPE_NOT_ALLOWED');
  }
  if (!Number.isSafeInteger(candidate.bytes) || candidate.bytes <= 0 || candidate.bytes > maximumBytes) {
    throw new Error('MEDIA_SIZE_NOT_ALLOWED');
  }
}

export interface ObjectStorage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
  get?(key: string): Promise<Uint8Array>;
}

export { LocalObjectStorage } from './local-storage';
export { S3ObjectStorage, type S3StorageConfig } from './s3-storage';
export { detectImageMimeType, imageSha256, optimizeImage, type OptimizedImage } from './processing';
