import * as vscode from 'vscode';
import { VSCodeWebSocketService } from './websocket';
import { SyncMessage } from './types';

let webSocketService: VSCodeWebSocketService;
let statusBarItem: vscode.StatusBarItem;
let username: string | undefined;

export async function activate(context: vscode.ExtensionContext) {
    // Initialize status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 500);
    statusBarItem.text = "$(sync) Platform Sync";
    statusBarItem.command = 'platform-sync.toggleConnection';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Initialize WebSocket service
    webSocketService = new VSCodeWebSocketService({
        url: 'wss://platform-sync-websocket.onrender.com',
        reconnectInterval: 5000,
        maxReconnectAttempts: 5
    });

    // Load saved username
    username = context.globalState.get('platform-sync.username');

    // Register event listeners
    webSocketService.on('message', (message: SyncMessage) => {
        handleIncomingMessage(message);
    });

    webSocketService.on('connected', () => {
        updateStatusBar(true);
    });

    webSocketService.on('disconnected', () => {
        updateStatusBar(false);
    });

    // Register commands
    let setUsernameCommand = vscode.commands.registerCommand('platform-sync.setUsername', async () => {
        const newUsername = await vscode.window.showInputBox({
            prompt: 'Enter your reviewer username',
            placeHolder: 'username',
            value: username
        });

        if (newUsername) {
            username = newUsername;
            await context.globalState.update('platform-sync.username', username);
            vscode.window.showInformationMessage(`Username set to: ${username}`);
        }
    });

    let toggleConnectionCommand = vscode.commands.registerCommand('platform-sync.toggleConnection', () => {
        if (webSocketService.isConnected()) {
            webSocketService.disconnect();
            updateStatusBar(false);
        } else {
            if (!username) {
                vscode.window.showErrorMessage('Please set your username first');
                vscode.commands.executeCommand('platform-sync.setUsername');
                return;
            }
            webSocketService.connect();
        }
    });

    // Register file change events
    let activeEditorChange = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && username && webSocketService.isConnected()) {
            const message: SyncMessage = {
                type: 'file_change',
                data: {
                    username: username,
                    filePath: editor.document.uri.fsPath,
                    line: editor.selection.active.line
                },
                timestamp: new Date().toISOString()
            };
            webSocketService.send(message);
        }
    });

    let selectionChange = vscode.window.onDidChangeTextEditorSelection((event) => {
        if (event.textEditor && username && webSocketService.isConnected()) {
            const message: SyncMessage = {
                type: 'cursor_change',
                data: {
                    username: username,
                    filePath: event.textEditor.document.uri.fsPath,
                    line: event.selections[0].active.line
                },
                timestamp: new Date().toISOString()
            };
            webSocketService.send(message);
        }
    });

    context.subscriptions.push(
        setUsernameCommand,
        toggleConnectionCommand,
        activeEditorChange,
        selectionChange
    );

    // Cleanup on deactivate
    context.subscriptions.push({
        dispose: () => {
            webSocketService.disconnect();
        }
    });
}

async function handleIncomingMessage(message: SyncMessage) {
    if (!message.data || !message.data.filePath || !message.data.line) {
        return;
    }

    // Only handle messages from other users
    if (message.data.username === username) {
        return;
    }

    const filePath = message.data.filePath;
    const line = message.data.line;

    try {
        const doc = await vscode.workspace.openTextDocument(filePath);
        const editor = await vscode.window.showTextDocument(doc);
        const position = new vscode.Position(line, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
        );
    } catch (error: unknown) {
        console.error('Error opening file:', error);
    }
}

function updateStatusBar(connected: boolean) {
    if (connected) {
        statusBarItem.text = "$(sync~spin) Platform Sync: Connected";
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
        statusBarItem.text = "$(sync) Platform Sync: Disconnected";
        statusBarItem.backgroundColor = undefined;
    }
}
