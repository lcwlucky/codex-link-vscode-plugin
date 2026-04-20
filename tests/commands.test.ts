import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockActiveTextEditor = vi.hoisted(() => ({ current: undefined }));

vi.mock('../src/codexDependency', () => ({
  activateCodexExtension: vi.fn().mockResolvedValue(undefined),
  getCodexDependencyState: vi.fn(() => 'ready'),
  getInstalledCodexExtension: vi.fn(() => ({})),
}));

vi.mock('vscode', () => ({
  Selection: class {
    anchor: { line: number; character: number };
    active: { line: number; character: number };
    start: { line: number; character: number };
    end: { line: number; character: number };
    isEmpty: boolean;

    constructor(
      anchorLine: number,
      anchorCharacter: number,
      activeLine: number,
      activeCharacter: number,
    ) {
      this.anchor = { line: anchorLine, character: anchorCharacter };
      this.active = { line: activeLine, character: activeCharacter };
      const startsBeforeActive =
        anchorLine < activeLine ||
        (anchorLine === activeLine && anchorCharacter <= activeCharacter);
      this.start = startsBeforeActive ? this.anchor : this.active;
      this.end = startsBeforeActive ? this.active : this.anchor;
      this.isEmpty =
        anchorLine === activeLine && anchorCharacter === activeCharacter;
    }
  },
  window: {
    get activeTextEditor() {
      return mockActiveTextEditor.current;
    },
    showErrorMessage: vi.fn(),
    showOpenDialog: vi.fn(),
    showTextDocument: vi.fn(async () => mockActiveTextEditor.current),
  },
  commands: {
    executeCommand: vi.fn(),
  },
}));

import {
  addResourceToChat,
  addResourcesToChat,
  addSelectionToChat,
  runAddSelectionToChat,
} from '../src/commands';
import * as codexDependency from '../src/codexDependency';

describe('commands', () => {
  beforeEach(() => {
    mockActiveTextEditor.current = undefined;
    vi.clearAllMocks();
  });

  it('blocks selection send when the dependency is missing', async () => {
    const showMessage = vi.fn();
    const executeCommand = vi.fn();

    await addSelectionToChat({
      dependencyState: 'missing',
      selectionState: {
        kind: 'valid',
        startLine: 0,
        activeLine: 0,
        activeCharacter: 10,
      },
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
      selectionState: {
        kind: 'valid',
        startLine: 0,
        activeLine: 0,
        activeCharacter: 10,
      },
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
    const wait = vi.fn().mockResolvedValue(undefined);

    await addSelectionToChat({
      dependencyState: 'ready',
      selectionState: {
        kind: 'valid',
        startLine: 0,
        activeLine: 0,
        activeCharacter: 10,
      },
      showErrorMessage: showMessage,
      executeCommand,
      wait,
    });

    expect(executeCommand).toHaveBeenNthCalledWith(1, 'chatgpt.openSidebar');
    expect(executeCommand).toHaveBeenNthCalledWith(2, 'chatgpt.addToThread');
    expect(wait).toHaveBeenCalledWith(150);
    expect(showMessage).not.toHaveBeenCalled();
  });

  it('opens codex and retries when the first selection send fails', async () => {
    const showMessage = vi.fn();
    const executeCommand = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('not ready'))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    const wait = vi.fn().mockResolvedValue(undefined);

    await addSelectionToChat({
      dependencyState: 'ready',
      selectionState: {
        kind: 'valid',
        startLine: 0,
        activeLine: 0,
        activeCharacter: 10,
      },
      showErrorMessage: showMessage,
      executeCommand,
      wait,
    });

    expect(executeCommand).toHaveBeenNthCalledWith(1, 'chatgpt.openSidebar');
    expect(executeCommand).toHaveBeenNthCalledWith(2, 'chatgpt.addToThread');
    expect(executeCommand).toHaveBeenNthCalledWith(3, 'chatgpt.openSidebar');
    expect(executeCommand).toHaveBeenNthCalledWith(4, 'chatgpt.addToThread');
    expect(wait).toHaveBeenCalled();
    expect(showMessage).not.toHaveBeenCalled();
  });

  it('shows the existing failure message when retry still fails', async () => {
    const showMessage = vi.fn();
    const executeCommand = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('not ready'))
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('still not ready'));
    const wait = vi.fn().mockResolvedValue(undefined);

    await addSelectionToChat({
      dependencyState: 'ready',
      selectionState: {
        kind: 'valid',
        startLine: 0,
        activeLine: 0,
        activeCharacter: 10,
      },
      showErrorMessage: showMessage,
      executeCommand,
      wait,
    });

    expect(executeCommand).toHaveBeenNthCalledWith(1, 'chatgpt.openSidebar');
    expect(executeCommand).toHaveBeenNthCalledWith(2, 'chatgpt.addToThread');
    expect(executeCommand).toHaveBeenNthCalledWith(3, 'chatgpt.openSidebar');
    expect(executeCommand).toHaveBeenNthCalledWith(4, 'chatgpt.addToThread');
    expect(showMessage).toHaveBeenCalledWith(
      'Unable to send context to Codex. Open the Codex sidebar and try again.',
    );
  });

  it('restores the original selection before sending to chat', async () => {
    const showMessage = vi.fn();
    const executeCommand = vi.fn();
    const restoreSelections = vi.fn();

    await addSelectionToChat({
      dependencyState: 'ready',
      selectionState: {
        kind: 'valid',
        startLine: 0,
        activeLine: 0,
        activeCharacter: 10,
      },
      showErrorMessage: showMessage,
      executeCommand,
      restoreSelections,
    });

    const restoreOrder = restoreSelections.mock.invocationCallOrder[0];
    const addToThreadOrder = executeCommand.mock.invocationCallOrder[1];

    expect(restoreOrder).toBeLessThan(addToThreadOrder);
    expect(executeCommand).toHaveBeenNthCalledWith(1, 'chatgpt.openSidebar');
    expect(executeCommand).toHaveBeenNthCalledWith(2, 'chatgpt.addToThread');
  });

  it('opens codex before sending when the first open only activates the extension host', async () => {
    const showMessage = vi.fn();
    const executeCommand = vi.fn().mockResolvedValue(undefined);
    const wait = vi.fn().mockResolvedValue(undefined);

    await addSelectionToChat({
      dependencyState: 'ready',
      selectionState: {
        kind: 'valid',
        startLine: 0,
        activeLine: 0,
        activeCharacter: 10,
      },
      showErrorMessage: showMessage,
      executeCommand,
      wait,
    });

    expect(executeCommand).toHaveBeenNthCalledWith(1, 'chatgpt.openSidebar');
    expect(executeCommand).toHaveBeenNthCalledWith(2, 'chatgpt.addToThread');
    expect(showMessage).not.toHaveBeenCalled();
  });

  it('runAddSelectionToChat restores the provided selection snapshot before delegating', async () => {
    const editor = {
      viewColumn: 1,
      document: {
        uri: {
          scheme: 'file',
          toString: () => 'file:///tmp/example.ts',
        },
      },
      selections: [
        {
          isEmpty: true,
          anchor: { line: 8, character: 8 },
          active: { line: 8, character: 8 },
          start: { line: 8, character: 8 },
          end: { line: 8, character: 8 },
        },
      ],
    };

    mockActiveTextEditor.current = editor;

    const vscode = await import('vscode');
    vi.mocked(vscode.commands.executeCommand).mockResolvedValue(undefined);
    vi.mocked(vscode.window.showErrorMessage).mockReturnValue(undefined);
    vi.mocked(vscode.window.showTextDocument).mockResolvedValue(editor as never);

    await runAddSelectionToChat({
      documentUri: 'file:///tmp/example.ts',
      selections: [
        {
          anchorLine: 3,
          anchorCharacter: 2,
          activeLine: 4,
          activeCharacter: 18,
        },
      ],
    });

    expect(editor.selections).toEqual([
      expect.objectContaining({
        anchor: { line: 3, character: 2 },
        active: { line: 4, character: 18 },
        start: { line: 3, character: 2 },
        end: { line: 4, character: 18 },
        isEmpty: false,
      }),
    ]);
    expect(vscode.window.showTextDocument).toHaveBeenCalledWith(editor.document, {
      viewColumn: editor.viewColumn,
      preserveFocus: false,
    });
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'chatgpt.addToThread',
    );
  });

  it('activates the Codex extension before sending the selection', async () => {
    const editor = {
      viewColumn: 1,
      document: {
        uri: {
          scheme: 'file',
          toString: () => 'file:///tmp/example.ts',
        },
      },
      selections: [
        {
          isEmpty: false,
          anchor: { line: 3, character: 2 },
          active: { line: 4, character: 18 },
          start: { line: 3, character: 2 },
          end: { line: 4, character: 18 },
        },
      ],
    };

    mockActiveTextEditor.current = editor;

    const vscode = await import('vscode');
    vi.mocked(vscode.commands.executeCommand).mockResolvedValue(undefined);
    vi.mocked(vscode.window.showErrorMessage).mockReturnValue(undefined);

    await runAddSelectionToChat();

    expect(codexDependency.activateCodexExtension).toHaveBeenCalledTimes(1);
  });

  it('uses a longer sidebar warmup when Codex was inactive before the command', async () => {
    const editor = {
      viewColumn: 1,
      document: {
        uri: {
          scheme: 'file',
          toString: () => 'file:///tmp/example.ts',
        },
      },
      selections: [
        {
          isEmpty: false,
          anchor: { line: 3, character: 2 },
          active: { line: 4, character: 18 },
          start: { line: 3, character: 2 },
          end: { line: 4, character: 18 },
        },
      ],
    };

    mockActiveTextEditor.current = editor;

    const wait = vi.fn().mockResolvedValue(undefined);
    vi.mocked(codexDependency.getInstalledCodexExtension).mockReturnValue({
      isActive: false,
    } as never);

    const showMessage = vi.fn();
    const executeCommand = vi.fn();

    await addSelectionToChat({
      dependencyState: 'ready',
      selectionState: {
        kind: 'valid',
        startLine: 0,
        activeLine: 0,
        activeCharacter: 10,
      },
      showErrorMessage: showMessage,
      executeCommand,
      wait,
      initialSidebarReadyMs: 1000,
    });

    expect(wait).toHaveBeenCalledWith(1000);
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
