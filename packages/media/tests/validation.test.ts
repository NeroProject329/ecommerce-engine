import { describe, expect, it } from 'vitest';
import { detectImageMimeType, imageSha256, optimizeImage, validateImageCandidate } from '../src';

describe('validateImageCandidate', () => {
  it('rejects executable content and oversized files', () => {
    expect(() => validateImageCandidate({ mimeType: 'application/x-msdownload', bytes: 20 })).toThrow(
      'MEDIA_TYPE_NOT_ALLOWED',
    );
    expect(() => validateImageCandidate({ mimeType: 'image/jpeg', bytes: 11 * 1024 * 1024 })).toThrow(
      'MEDIA_SIZE_NOT_ALLOWED',
    );
  });

  it('uses the binary signature instead of a claimed content type', () => {
    const pngHeader = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectImageMimeType(pngHeader)).toBe('image/png');
    expect(() => detectImageMimeType(new TextEncoder().encode('<script>'))).toThrow('MEDIA_SIGNATURE_INVALID');
  });

  it('generates deterministic SHA-256 hashes for deduplication', () => {
    const body = new TextEncoder().encode('same image bytes');
    expect(imageSha256(body)).toBe(imageSha256(body));
    expect(imageSha256(body)).toHaveLength(64);
  });

  it('creates an optimized WebP rendition with dimensions', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    const result = await optimizeImage(png);
    expect(result).toMatchObject({ width: 1, height: 1, renditionMimeType: 'image/webp', renditionWidth: 1, renditionHeight: 1 });
    expect(result.rendition.byteLength).toBeGreaterThan(0);
  });
});
