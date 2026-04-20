import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  Uri: {
    parse: (value: string) => ({
      toString: () => value,
    }),
  },
  extensions: {
    getExtension: vi.fn(),
  },
}));

import {
  activateCodexExtension,
  CODEX_EXTENSION_ID,
  getCodexDependencyState,
  getCodexExtensionMarketplaceUri,
  openCodexExtensionInstallPage,
} from '../src/codexDependency';

describe('codex dependency', () => {
  it('returns missing when the extension is absent', () => {
    expect(getCodexDependencyState(undefined)).toBe('missing');
  });

  it('returns ready when the extension exists but is not yet active', () => {
    expect(
      getCodexDependencyState({
        id: CODEX_EXTENSION_ID,
        isActive: false,
        packageJSON: {},
      }),
    ).toBe('ready');
  });

  it('returns ready when the extension exists and is active', () => {
    expect(
      getCodexDependencyState({
        id: CODEX_EXTENSION_ID,
        isActive: true,
        packageJSON: {},
      }),
    ).toBe('ready');
  });

  it('activates the extension when it is installed but not yet active', async () => {
    const activate = vi.fn().mockResolvedValue(undefined);

    await activateCodexExtension({
      id: CODEX_EXTENSION_ID,
      isActive: false,
      activate,
    });

    expect(activate).toHaveBeenCalledTimes(1);
  });

  it('does not activate the extension again when it is already active', async () => {
    const activate = vi.fn().mockResolvedValue(undefined);

    await activateCodexExtension({
      id: CODEX_EXTENSION_ID,
      isActive: true,
      activate,
    });

    expect(activate).not.toHaveBeenCalled();
  });

  it('builds the vscode marketplace uri', () => {
    expect(getCodexExtensionMarketplaceUri().toString()).toBe(
      'vscode:extension/openai.chatgpt',
    );
  });

  it('opens the codex extension page when install guidance is triggered', async () => {
    const openExternal = vi.fn();

    await openCodexExtensionInstallPage(openExternal);

    expect(openExternal).toHaveBeenCalledTimes(1);
    expect(openExternal.mock.calls[0]?.[0]?.toString()).toBe(
      getCodexExtensionMarketplaceUri().toString(),
    );
  });
});
