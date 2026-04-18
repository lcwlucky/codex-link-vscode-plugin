import { describe, expect, it } from 'vitest';
import manifest from '../package.json';

describe('icon manifest', () => {
  it('uses a raster marketplace icon for publishing', () => {
    expect(manifest.icon).toBe('resources/codex-link-marketplace.png');
  });
});
