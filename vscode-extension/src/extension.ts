import * as vscode from 'vscode';
import { BaseWebSocketService, ConnectionStatus, Logger, StorageService, SyncMessage } from '@platform-sync/shared';

class VSCodeLogger implements Logger {
  debug(message: string, ...args: any[]): void {
    console.debug(message, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.log(message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(message, ...args);
  }

  error(message: string, error?: Error, ...args: any[]): void {
    console.error(message, error, ...args);
  }
}

class VSCodeStorageService implements StorageService {
  constructor(private context: vscode.ExtensionContext) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.context.globalState.get<T>(key);
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.context.globalState.update(key, value);
  }

  async delete(key: string): Promise<void> {
    await this.context.globalState.update(key, undefined);
  }
}

class VSCodeWebSocketService extends BaseWebSocketService {
  private statusBarItem: vscode.StatusBarItem;

  constructor(logger: Logger) {
    super(logger);
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    this.statusBarItem.command = 'platform-sync.toggleConnection';
    this.updateStatusBar(ConnectionStatus.DISCONNECTED);
    this.statusBarItem.show();
  }

  protected onConnectionChange(status: ConnectionStatus): void {
    this.updateStatusBar(status);
    this.notifyListeners();
  }

  private updateStatusBar(status: ConnectionStatus): void {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        this.statusBarItem.text = '$(check) Platform Sync';
        this.statusBarItem.tooltip = 'Connected to Platform Sync';
        break;
      case ConnectionStatus.DISCONNECTED:
        this.statusBarItem.text = '$(circle-slash) Platform Sync';
        this.statusBarItem.tooltip = 'Disconnected from Platform Sync';
        break;
      case ConnectionStatus.FAILED_TO_CONNECT:
        this.statusBarItem.text = '$(error) Platform Sync';
        this.statusBarItem.tooltip = 'Failed to connect to Platform Sync';
        break;
    }
  }
}

export class PlatformSyncExtension {
  private wsService: VSCodeWebSocketService;
  private storage: VSCodeStorageService;
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    const logger = new VSCodeLogger();
    this.wsService = new VSCodeWebSocketService(logger);
    this.storage = new VSCodeStorageService(context);
    this.registerCommands(context);
    this.registerEditorListeners();
  }

  private registerCommands(context: vscode.ExtensionContext): void {
    this.disposables.push(
      vscode.commands.registerCommand('platform-sync.setUsername', this.handleSetUsername.bind(this)),
      vscode.commands.registerCommand('platform-sync.toggleConnection', this.handleToggleConnection.bind(this))
    );

    context.subscriptions.push(...this.disposables);
  }

  private registerEditorListeners(): void {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(this.handleActiveEditorChange.bind(this)),
      vscode.window.onDidChangeTextEditorSelection(this.handleSelectionChange.bind(this))
    );
  }

  private async handleSetUsername(): Promise<void> {
    const username = await vscode.window.showInputBox({
      placeHolder: 'Enter your reviewer username',
      prompt: 'Please enter your reviewer username'
    });

    if (username) {
      await this.storage.set('reviewerUsername', username);
      vscode.window.showInformationMessage(`Reviewer username set to: ${username}`);
    }
  }

  private async handleToggleConnection(): Promise<void> {
    if (this.wsService.isConnected()) {
      this.wsService.disconnect();
    } else {
      const username = await this.storage.get<string>('reviewerUsername');
      if (!username) {
        vscode.window.showWarningMessage('Please set your reviewer username before connecting');
        return;
      }

      await this.wsService.connect({
        url: 'wss://platform-sync-websocket.onrender.com',
        reconnectAttempts: 3,
        reconnectInterval: 5000
      });
    }
  }

  private async handleActiveEditorChange(editor: vscode.TextEditor | undefined): Promise<void> {
    if (editor && this.wsService.isConnected()) {
      const username = await this.storage.get<string>('reviewerUsername');
      if (username) {
        const path = editor.document.uri.path.replace(/\//g, '::');
        this.wsService.sendMessage({
          type: 'PATH_CHANGE',
          reviewerUsername: username,
          data: { path },
          timestamp: Date.now()
        });
      }
    }
  }

  private async handleSelectionChange(event: vscode.TextEditorSelectionChangeEvent): Promise<void> {
    if (event.textEditor && this.wsService.isConnected()) {
      const username = await this.storage.get<string>('reviewerUsername');
      if (username) {
        const line = event.selections[0].active.line + 1;
        this.wsService.sendMessage({
          type: 'LINE_CHANGE',
          reviewerUsername: username,
          data: { line },
          timestamp: Date.now()
        });
      }
    }
  }

  dispose(): void {
    this.wsService.disconnect();
    this.disposables.forEach(d => d.dispose());
  }
}

export function activate(context: vscode.ExtensionContext): void {
  new PlatformSyncExtension(context);
}
