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

  it('wires the editor title action to add the current file only for local files', () => {
    const editorTitleEntry = manifest.contributes.menus['editor/title']?.find(
      (item) => item.command === 'codexBridge.addCurrentFileToChat',
    );

    expect(editorTitleEntry?.when).toBe('editorTextFocus && resourceScheme == file');
  });

  it('exposes a terminal selection command in the manifest', () => {
    const commandEntry = manifest.contributes.commands.find(
      (item) => item.command === 'codexBridge.addTerminalSelectionToChat',
    );
    const terminalMenuEntry = manifest.contributes.menus['terminal/context']?.find(
      (item) => item.command === 'codexBridge.addTerminalSelectionToChat',
    );
    const terminalKeybinding = manifest.contributes.keybindings.find(
      (item) => item.command === 'codexBridge.addTerminalSelectionToChat',
    );

    expect(commandEntry).toEqual({
      command: 'codexBridge.addTerminalSelectionToChat',
      title: 'Add Terminal Selection to Codex',
    });
    expect(terminalMenuEntry).toEqual({
      command: 'codexBridge.addTerminalSelectionToChat',
      group: '3_edit',
    });
    expect(terminalKeybinding).toEqual({
      command: 'codexBridge.addTerminalSelectionToChat',
      key: 'ctrl+alt+l',
      mac: 'cmd+alt+l',
      when: "terminalFocus || (activePanel == 'terminal' && !textInputFocus)",
    });
  });

  it('exposes a configurable threshold for single-line selection actions', () => {
    const property =
      manifest.contributes.configuration?.properties?.[
        'codexLink.minSingleLineSelectionLength'
      ];

    expect(property).toEqual({
      type: 'number',
      default: 50,
      minimum: 1,
      markdownDescription:
        'Minimum trimmed character length for showing `Add to Codex` on single-line selections without whitespace. Multi-line selections and single-line selections containing whitespace still always show the action.',
    });
  });

  it('exposes configurable terminal capture cleanup settings', () => {
    const retentionProperty =
      manifest.contributes.configuration?.properties?.[
        'codexLink.terminalCaptureRetentionHours'
      ];
    const maxFilesProperty =
      manifest.contributes.configuration?.properties?.[
        'codexLink.terminalCaptureMaxFiles'
      ];

    expect(retentionProperty).toEqual({
      type: 'number',
      default: 24,
      minimum: 1,
      markdownDescription:
        'Delete Codex Link terminal capture temp files older than this many hours.',
    });
    expect(maxFilesProperty).toEqual({
      type: 'number',
      default: 100,
      minimum: 1,
      markdownDescription:
        'Keep at most this many recent Codex Link terminal capture temp files.',
    });
  });
});
