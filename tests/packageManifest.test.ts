import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import manifest from '../package.json';

describe('package manifest', () => {
  it('includes a marketplace publisher identifier', () => {
    expect(manifest.publisher).toBeTypeOf('string');
    expect(manifest.publisher.length).toBeGreaterThan(0);
  });

  it('includes marketplace presentation metadata', () => {
    expect(manifest.categories).toEqual(expect.arrayContaining(['Other']));
    expect(manifest.keywords).toEqual(
      expect.arrayContaining(['codex', 'openai', 'agent']),
    );
    expect(manifest.galleryBanner).toEqual({
      color: '#102A43',
      theme: 'dark',
    });
  });

  it('includes the public GitHub repository metadata in the manifest', () => {
    expect(manifest.repository).toEqual({
      type: 'git',
      url: 'https://github.com/lcwlucky/codex-link-vscode-plugin.git',
    });
    expect(manifest.homepage).toBe(
      'https://github.com/lcwlucky/codex-link-vscode-plugin',
    );
    expect(manifest.bugs).toEqual({
      url: 'https://github.com/lcwlucky/codex-link-vscode-plugin/issues',
    });
  });

  it('includes explicit vsce release scripts for pnpm workspaces', () => {
    expect(manifest.scripts['package:vsix']).toBe('vsce package --no-dependencies');
    expect(manifest.scripts['publish:vsce']).toBe('vsce publish --no-dependencies');
  });

  it('includes Open VSX publishing scripts', () => {
    expect(manifest.scripts['openvsx:create-namespace']).toBe(
      'npx ovsx create-namespace changwenluo',
    );
    expect(manifest.scripts['openvsx:publish']).toBe('npx ovsx publish');
    expect(manifest.scripts['publish:all']).toBe(
      'pnpm run publish:vsce && pnpm run openvsx:publish',
    );
  });

  it('does not rely on vsce image rewriting for readme assets', () => {
    expect(manifest.vsce).toBeUndefined();
  });

  it('excludes the external demo gif from the packaged vsix', () => {
    const vscodeIgnore = readFileSync(
      new URL('../.vscodeignore', import.meta.url),
      'utf8',
    );

    expect(vscodeIgnore).toContain('resources/demo.gif');
  });

  it('excludes repository automation files from the packaged vsix', () => {
    const vscodeIgnore = readFileSync(
      new URL('../.vscodeignore', import.meta.url),
      'utf8',
    );

    expect(vscodeIgnore).toContain('.github/**');
  });

  it('uses a different command for the selection shortcut than the editor title action', () => {
    const keybindingCommand = manifest.contributes.keybindings.find(
      (item) => item.command.includes('Selection'),
    )?.command;
    const editorTitleCommand = manifest.contributes.menus['editor/title'][0]?.command;

    expect(keybindingCommand).toBeDefined();
    expect(editorTitleCommand).toBeDefined();
    expect(keybindingCommand).not.toBe(editorTitleCommand);
  });

  it('hides the shortcut-only command from the command palette', () => {
    const hiddenShortcutEntry = manifest.contributes.menus.commandPalette?.find(
      (item) => item.command === 'codexBridge.addSelectionToChatShortcut',
    );

    expect(hiddenShortcutEntry).toEqual({
      command: 'codexBridge.addSelectionToChatShortcut',
      when: 'false',
    });
  });

  it('does not restrict the selection shortcut to file-backed editors', () => {
    const shortcutEntry = manifest.contributes.keybindings.find(
      (item) => item.command === 'codexBridge.addSelectionToChatShortcut',
    );

    expect(shortcutEntry?.when).toBe('editorTextFocus && editorHasSelection');
  });

  it('does not restrict the editor action to file-backed editors', () => {
    const editorTitleEntry = manifest.contributes.menus['editor/title']?.find(
      (item) => item.command === 'codexBridge.addSelectionToChat',
    );

    expect(editorTitleEntry?.when).toBe('editorTextFocus');
  });
});
