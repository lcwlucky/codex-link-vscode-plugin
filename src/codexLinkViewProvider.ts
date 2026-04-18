import * as vscode from 'vscode';
import {
  runAddCurrentFileToChat,
  runAddResourceUrisToChat,
  runOpenCodex,
  runPickFilesOrFoldersToChat,
  type AddResourcesResult,
} from './commands';
import { extractDroppedFileUris } from './dropZoneData';
import { messages } from './messages';

type InboundMessage =
  | { type: 'openCodex' }
  | { type: 'addCurrentFile' }
  | { type: 'pickFilesOrFolders' }
  | { type: 'drop'; payloads: string[] };

type OutboundMessage = {
  type: 'status';
  kind: AddResourcesResult['kind'];
  message: string;
};

export class CodexLinkViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'codexLink.dropZoneView';

  private view: vscode.WebviewView | undefined;

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken,
  ): void {
    void context;
    void token;
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message: InboundMessage) => {
      void this.handleMessage(message);
    });
  }

  private async handleMessage(message: InboundMessage): Promise<void> {
    switch (message.type) {
      case 'openCodex':
        this.postStatus(await runOpenCodex());
        return;
      case 'addCurrentFile':
        this.postStatus(await runAddCurrentFileToChat());
        return;
      case 'pickFilesOrFolders':
        this.postStatus(await runPickFilesOrFoldersToChat());
        return;
      case 'drop': {
        const uris = extractDroppedFileUris(message.payloads).map((uri) =>
          vscode.Uri.parse(uri),
        );

        if (!uris.length) {
          this.postStatus({
            kind: 'error',
            message: messages.dropHint,
            addedCount: 0,
          });
          return;
        }

        this.postStatus(await runAddResourceUrisToChat(uris));
        return;
      }
    }
  }

  private postStatus(result: AddResourcesResult): void {
    this.view?.webview.postMessage({
      type: 'status',
      kind: result.kind,
      message: result.message,
    } satisfies OutboundMessage);
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      :root {
        color-scheme: light dark;
      }

      body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
        margin: 0;
        padding: 16px;
      }

      .shell {
        display: grid;
        gap: 12px;
      }

      .drop-zone {
        border: 1px dashed var(--vscode-focusBorder);
        border-radius: 12px;
        padding: 16px;
        background: color-mix(in srgb, var(--vscode-editorWidget-background) 92%, transparent);
        display: grid;
        gap: 12px;
      }

      .drop-zone.dragover {
        border-style: solid;
        background: color-mix(in srgb, var(--vscode-button-background) 14%, transparent);
      }

      .title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .hint {
        font-size: 12px;
        opacity: 0.82;
        line-height: 1.5;
      }

      .drop-actions {
        display: grid;
        gap: 8px;
      }

      .actions {
        display: grid;
        gap: 8px;
      }

      button {
        border: 0;
        border-radius: 8px;
        padding: 10px 12px;
        font: inherit;
        cursor: pointer;
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
      }

      button.secondary {
        color: var(--vscode-button-secondaryForeground);
        background: var(--vscode-button-secondaryBackground);
      }

      .status {
        min-height: 40px;
        border-radius: 8px;
        padding: 10px 12px;
        background: var(--vscode-editorWidget-background);
        font-size: 12px;
        line-height: 1.5;
      }

      .status.success {
        outline: 1px solid color-mix(in srgb, var(--vscode-testing-iconPassed) 60%, transparent);
      }

      .status.error {
        outline: 1px solid color-mix(in srgb, var(--vscode-testing-iconFailed) 60%, transparent);
      }

      .status.info {
        outline: 1px solid color-mix(in srgb, var(--vscode-focusBorder) 60%, transparent);
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="drop-zone" id="drop-zone">
        <div class="title">Add files or folders to Codex</div>
        <div class="hint">
          Use the picker below for the most reliable workflow. Drag and drop from
          the VS Code Explorer remains best effort and may not work in some VS Code
          environments.
        </div>
        <div class="drop-actions">
          <button id="pick-files-primary">Pick Files or Folder</button>
          <div class="hint">
            If Explorer drag and drop works in your setup, you can still drop
            files or folders onto this card.
          </div>
        </div>
      </div>

      <div class="actions">
        <button id="open-codex">Open Codex</button>
        <button class="secondary" id="add-current-file">Add Current File</button>
        <button class="secondary" id="pick-files">
          Pick Files or Folder
        </button>
      </div>

      <div class="status info" id="status">
        ${messages.dropHint}
      </div>
    </div>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const dropZone = document.getElementById('drop-zone');
      const status = document.getElementById('status');

      function setStatus(kind, message) {
        status.className = 'status ' + kind;
        status.textContent = message;
      }

      document.getElementById('open-codex').addEventListener('click', () => {
        vscode.postMessage({ type: 'openCodex' });
      });

      document
        .getElementById('add-current-file')
        .addEventListener('click', () => {
          vscode.postMessage({ type: 'addCurrentFile' });
        });

      document.getElementById('pick-files').addEventListener('click', () => {
        vscode.postMessage({ type: 'pickFilesOrFolders' });
      });

      document
        .getElementById('pick-files-primary')
        .addEventListener('click', () => {
          vscode.postMessage({ type: 'pickFilesOrFolders' });
        });

      dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.classList.add('dragover');
      });

      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
      });

      dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('dragover');
        const payloads = new Set();
        const dataTransfer = event.dataTransfer;

        if (dataTransfer) {
          const preferredTypes = ['text/uri-list', 'text/plain'];

          preferredTypes.forEach((type) => {
            const value = dataTransfer.getData(type);
            if (value) {
              payloads.add(value);
            }
          });

          Array.from(dataTransfer.types).forEach((type) => {
            if (typeof type !== 'string') {
              return;
            }

            try {
              const value = dataTransfer.getData(type);
              if (value) {
                payloads.add(value);
              }
            } catch {
              // Ignore unreadable drag data types and keep best-effort behavior.
            }
          });
        }

        vscode.postMessage({ type: 'drop', payloads: Array.from(payloads) });
      });

      window.addEventListener('message', (event) => {
        const message = event.data;
        if (message?.type === 'status') {
          setStatus(message.kind, message.message);
        }
      });
    </script>
  </body>
</html>`;
  }
}

function getNonce(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';

  for (let index = 0; index < 32; index += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return nonce;
}
