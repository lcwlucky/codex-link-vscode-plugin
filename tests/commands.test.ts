import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
    showErrorMessage: vi.fn(),
    showOpenDialog: vi.fn(),
  },
  commands: {
    executeCommand: vi.fn(),
  },
}));

import {
  addResourceToChat,
  addResourcesToChat,
  addSelectionToChat,
} from '../src/commands';

describe('commands', () => {
  it('blocks selection send when the dependency is missing', async () => {
    const showMessage = vi.fn();
    const executeCommand = vi.fn();

    await addSelectionToChat({
      dependencyState: 'missing',
      selectionState: { kind: 'valid', startLine: 0 },
      showErrorMessage: showMessage,
      executeCommand,
    });

    expect(showMessage).toHaveBeenCalled();
    expect(executeCommand).not.toHaveBeenCalled();
  });

  it('opens install guidance when the missing dependency action is selected', async () => {
    const showMessage = vi.fn().mockResolvedValue('Install Codex');
    const executeCommand = vi.fn();

    await addSelectionToChat({
      dependencyState: 'missing',
      selectionState: { kind: 'valid', startLine: 0 },
      showErrorMessage: showMessage,
      executeCommand,
    });

    expect(executeCommand).toHaveBeenCalledWith(
      'codexBridge.installCodexDependency',
    );
  });

  it('delegates valid selections to chatgpt.addToThread', async () => {
    const showMessage = vi.fn();
    const executeCommand = vi.fn();

    await addSelectionToChat({
      dependencyState: 'ready',
      selectionState: { kind: 'valid', startLine: 0 },
      showErrorMessage: showMessage,
      executeCommand,
    });

    expect(executeCommand).toHaveBeenCalledWith('chatgpt.addToThread');
    expect(showMessage).not.toHaveBeenCalled();
  });

  it('opens codex and retries when the first selection send fails', async () => {
    const showMessage = vi.fn();
    const executeCommand = vi
      .fn()
      .mockRejectedValueOnce(new Error('not ready'))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    const wait = vi.fn().mockResolvedValue(undefined);

    await addSelectionToChat({
      dependencyState: 'ready',
      selectionState: { kind: 'valid', startLine: 0 },
      showErrorMessage: showMessage,
      executeCommand,
      wait,
    });

    expect(executeCommand).toHaveBeenNthCalledWith(1, 'chatgpt.addToThread');
    expect(executeCommand).toHaveBeenNthCalledWith(2, 'chatgpt.openSidebar');
    expect(executeCommand).toHaveBeenNthCalledWith(3, 'chatgpt.addToThread');
    expect(wait).toHaveBeenCalled();
    expect(showMessage).not.toHaveBeenCalled();
  });

  it('shows the existing failure message when retry still fails', async () => {
    const showMessage = vi.fn();
    const executeCommand = vi
      .fn()
      .mockRejectedValueOnce(new Error('not ready'))
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('still not ready'));
    const wait = vi.fn().mockResolvedValue(undefined);

    await addSelectionToChat({
      dependencyState: 'ready',
      selectionState: { kind: 'valid', startLine: 0 },
      showErrorMessage: showMessage,
      executeCommand,
      wait,
    });

    expect(executeCommand).toHaveBeenNthCalledWith(1, 'chatgpt.addToThread');
    expect(executeCommand).toHaveBeenNthCalledWith(2, 'chatgpt.openSidebar');
    expect(executeCommand).toHaveBeenNthCalledWith(3, 'chatgpt.addToThread');
    expect(showMessage).toHaveBeenCalledWith(
      'Unable to send context to Codex. Open the Codex sidebar and try again.',
    );
  });

  it('delegates file resources to chatgpt.addFileToThread', async () => {
    const showMessage = vi.fn();
    const executeCommand = vi.fn();
    const uri = { scheme: 'file', fsPath: '/tmp/example.ts' };

    await addResourceToChat({
      dependencyState: 'ready',
      resource: uri,
      showErrorMessage: showMessage,
      executeCommand,
    });

    expect(executeCommand).toHaveBeenCalledWith('chatgpt.addFileToThread', uri);
    expect(showMessage).not.toHaveBeenCalled();
  });

  it('adds multiple resources and opens codex', async () => {
    const showMessage = vi.fn();
    const executeCommand = vi.fn();
    const resources = [
      { scheme: 'file', fsPath: '/tmp/example.ts' },
      { scheme: 'file', fsPath: '/tmp/folder' },
    ];

    const result = await addResourcesToChat({
      dependencyState: 'ready',
      resources,
      showErrorMessage: showMessage,
      executeCommand,
    });

    expect(executeCommand).toHaveBeenNthCalledWith(
      1,
      'chatgpt.addFileToThread',
      resources[0],
    );
    expect(executeCommand).toHaveBeenNthCalledWith(
      2,
      'chatgpt.addFileToThread',
      resources[1],
    );
    expect(executeCommand).toHaveBeenNthCalledWith(3, 'chatgpt.openSidebar');
    expect(result).toEqual({
      kind: 'success',
      message: 'Added 2 items to Codex.',
      addedCount: 2,
    });
    expect(showMessage).not.toHaveBeenCalled();
  });

  it('rejects non-file resources', async () => {
    const showMessage = vi.fn();
    const executeCommand = vi.fn();

    const result = await addResourcesToChat({
      dependencyState: 'ready',
      resources: [{ scheme: 'untitled', fsPath: '' }],
      showErrorMessage: showMessage,
      executeCommand,
    });

    expect(showMessage).toHaveBeenCalled();
    expect(executeCommand).not.toHaveBeenCalled();
    expect(result.kind).toBe('error');
  });
});
