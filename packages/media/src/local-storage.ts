import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { ObjectStorage } from './index';

export class LocalObjectStorage implements ObjectStorage {
  private readonly root: string;

  constructor(root: string, private readonly baseUrl = '/v1/public/media') {
    this.root = resolve(root);
  }

  async put(key: string, body: Uint8Array): Promise<void> {
    const target = this.target(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
  }

  async delete(key: string): Promise<void> {
    await rm(this.target(key), { force: true });
  }

  async get(key: string): Promise<Uint8Array> {
    return readFile(this.target(key));
  }

  publicUrl(key: string): string {
    return `${this.baseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  private target(key: string): string {
    if (!key || key.includes('..') || key.includes('\\')) throw new Error('STORAGE_KEY_INVALID');
    const target = resolve(this.root, key);
    if (!target.startsWith(`${this.root}${sep}`)) throw new Error('STORAGE_KEY_INVALID');
    return target;
  }
}
