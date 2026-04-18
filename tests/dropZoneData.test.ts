import { describe, expect, it } from 'vitest';
import { extractDroppedFileUris } from '../src/dropZoneData';

describe('drop zone data', () => {
  it('extracts file uris from text payloads', () => {
    expect(
      extractDroppedFileUris([
        'file:///tmp/example.ts\nfile:///tmp/folder',
        '# comment\nfile:///tmp/another.ts',
      ]),
    ).toEqual([
      'file:///tmp/example.ts',
      'file:///tmp/folder',
      'file:///tmp/another.ts',
    ]);
  });

  it('deduplicates and ignores non-file uris', () => {
    expect(
      extractDroppedFileUris([
        'file:///tmp/example.ts',
        'https://example.com/demo.ts\nfile:///tmp/example.ts',
      ]),
    ).toEqual(['file:///tmp/example.ts']);
  });

  it('extracts file uris embedded inside richer payload text', () => {
    expect(
      extractDroppedFileUris([
        'resources=file:///tmp/example.ts;label=Example',
        '{"items":["file:///tmp/folder","ignored"]}',
      ]),
    ).toEqual(['file:///tmp/example.ts', 'file:///tmp/folder']);
  });

  it('deduplicates repeated uris across mixed payload formats', () => {
    expect(
      extractDroppedFileUris([
        'file:///tmp/example.ts',
        'copy=file:///tmp/example.ts',
        'values=["file:///tmp/example.ts","file:///tmp/other.ts"]',
      ]),
    ).toEqual(['file:///tmp/example.ts', 'file:///tmp/other.ts']);
  });
});
