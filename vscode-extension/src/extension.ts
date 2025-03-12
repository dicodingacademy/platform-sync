import * as vscode from 'vscode';
import { VSCodeWebSocketService } from './websocket';
import { ConnectionConfig, ConnectionStatus } from './types';
import * as path from 'path';

let statusBarItem: vscode.StatusBarItem;
let webSocketService: VSCodeWebSocketService;
let recentLine = -1;
let recentPath = '';

export function activate(context: vscode.ExtensionContext) {
    console.log('Platform Sync Extension Activated');

    try {
        const savedUrl = context.globalState.get<string>('platform-sync.websocketUrl');
        const config: ConnectionConfig = {
            url: savedUrl,
            reconnectInterval: 5000,
            maxReconnectAttempts: 5
        };
        webSocketService = new VSCodeWebSocketService(config);
        
        const username = context.globalState.get<string>('platform-sync.username');
        if (username) {
            webSocketService.setUsername(username);
        }
        
        webSocketService.on('connected', () => {
            updateStatusBar(context, ConnectionStatus.CONNECTED);
            vscode.window.showInformationMessage('Platform Sync: Connected to server');
        });
        
        webSocketService.on('disconnected', () => {
            updateStatusBar(context, ConnectionStatus.DISCONNECTED);
        });
        
        webSocketService.on('error', (error) => {
            updateStatusBar(context, ConnectionStatus.FAILED_TO_CONNECT);
            vscode.window.showErrorMessage(`Platform Sync: Connection error - ${error.message}`);
        });

        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.command = 'platform-sync.showMenu';
        context.subscriptions.push(statusBarItem);
        updateStatusBar(context, ConnectionStatus.DISCONNECTED);
        
        statusBarItem.show();

        registerCommands(context);
        setupFileDetection(context);
        
        if (username) {
            webSocketService.connect();
        } else {
            promptSetUsername();
        }
    } catch (error) {
        console.error('Failed to activate Platform Sync extension:', error);
        vscode.window.showErrorMessage(`Platform Sync: Activation failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('platform-sync.showInfo', () => {
            const username = context.globalState.get<string>('platform-sync.username') || 'Not set';
            const connectionStatus = webSocketService.isConnected() ? 'Connected' : 'Disconnected';
            vscode.window.showInformationMessage(`Platform Sync: Username: ${username}, Status: ${connectionStatus}`);
        }),
        
        vscode.commands.registerCommand('platform-sync.setUsername', async () => {
            const username = await vscode.window.showInputBox({
                prompt: 'Enter your reviewer username',
                placeHolder: 'username',
                value: context.globalState.get<string>('platform-sync.username') || ''
            });

            if (username) {
                await context.globalState.update('platform-sync.username', username);
                webSocketService.setUsername(username);
                vscode.window.showInformationMessage(`Username set to: ${username}`);
                updateStatusBar(context, webSocketService.isConnected() ? ConnectionStatus.CONNECTED : ConnectionStatus.DISCONNECTED);
                
                if (!webSocketService.isConnected()) {
                    webSocketService.connect();
                }
            }
        }),
        
        vscode.commands.registerCommand('platform-sync.toggleConnection', () => {
            if (webSocketService.isConnected()) {
                webSocketService.disconnect();
                vscode.window.showInformationMessage('Platform Sync: Disconnected from server');
            } else {
                if (!context.globalState.get<string>('platform-sync.username')) {
                    vscode.window.showWarningMessage('Platform Sync: Please set your username first');
                    vscode.commands.executeCommand('platform-sync.setUsername');
                    return;
                }
                webSocketService.connect();
            }
        }),
        
        vscode.commands.registerCommand('platform-sync.showMenu', async () => {
            const isConnected = webSocketService.isConnected();
            const items = [
                { label: 'Set Username', description: 'Set your reviewer username' },
                { label: 'Set WebSocket URL', description: 'Configure WebSocket server URL' },
                { label: isConnected ? 'Disconnect' : 'Connect', description: isConnected ? 'Disconnect from sync server' : 'Connect to sync server' }
            ];
            
            const selection = await vscode.window.showQuickPick(items, { placeHolder: 'Platform Sync Menu' });
            
            if (selection) {
                switch (selection.label) {
                    case 'Set Username':
                        vscode.commands.executeCommand('platform-sync.setUsername');
                        break;
                    case 'Set WebSocket URL':
                        vscode.commands.executeCommand('platform-sync.setWebSocketUrl');
                        break;
                    case 'Connect':
                    case 'Disconnect':
                        vscode.commands.executeCommand('platform-sync.toggleConnection');
                        break;
                }
            }
        }),

        vscode.commands.registerCommand('platform-sync.setWebSocketUrl', async () => {
            const currentUrl = context.globalState.get<string>('platform-sync.websocketUrl') || 'wss://platform-sync-websocket.onrender.com';
            const url = await vscode.window.showInputBox({
                prompt: 'Enter WebSocket URL',
                placeHolder: 'wss://your-websocket-url',
                value: currentUrl
            });

            if (url) {
                await context.globalState.update('platform-sync.websocketUrl', url);
                webSocketService.setWebSocketUrl(url);
                vscode.window.showInformationMessage(`WebSocket URL set to: ${url}`);
                updateStatusBar(context, webSocketService.isConnected() ? ConnectionStatus.CONNECTED : ConnectionStatus.DISCONNECTED);
                
                if (webSocketService.isConnected()) {
                    webSocketService.disconnect();
                }
                if (context.globalState.get<string>('platform-sync.username')) {
                    webSocketService.connect();
                }
            }
        })
    );
}

function setupFileDetection(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                processFileChange(editor, context);
            }
        }),
        
        vscode.window.onDidChangeTextEditorSelection(event => {
            processCursorChange(event, context);
        })
    );
    
    if (vscode.window.activeTextEditor) {
        processFileChange(vscode.window.activeTextEditor, context);
    }
}

function processFileChange(editor: vscode.TextEditor, context: vscode.ExtensionContext) {
    if (!webSocketService.isConnected()) return;
    
    const username = context.globalState.get<string>('platform-sync.username');
    if (!username) return;
    
    const filePath = editor.document.uri.fsPath;
    let relativePath = filePath;
    
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        const workspaceFolder = workspaceFolders[0];
        relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);
        
        const newPath = path.join(workspaceFolder.name, relativePath).replace(/[/\\]/g, '::');
        if (newPath !== recentPath) {
            recentPath = newPath;
            sendPathMessage(username, newPath);
        }
    }
}

function processCursorChange(event: vscode.TextEditorSelectionChangeEvent, context: vscode.ExtensionContext) {
    if (!webSocketService.isConnected()) return;
    
    const username = context.globalState.get<string>('platform-sync.username');
    if (!username) return;
    
    const line = event.selections[0].active.line + 1;
    if (line !== recentLine) {
        recentLine = line;
        sendLineMessage(username, line);
    }
}

function sendPathMessage(username: string, path: string) {
    if (!webSocketService.isConnected()) return;
    
    webSocketService.send({
        type: 'path',
        data: { username, filePath: path, line: -1 },
        timestamp: new Date().toISOString()
    });
}

function sendLineMessage(username: string, line: number) {
    if (!webSocketService.isConnected()) return;
    
    webSocketService.send({
        type: 'line',
        data: { username, filePath: '', line },
        timestamp: new Date().toISOString()
    });
}

function updateStatusBar(context: vscode.ExtensionContext, status: ConnectionStatus) {
    if (!statusBarItem) return;
    
    const username = context.globalState.get<string>('platform-sync.username') || 'Not set';
    const url = context.globalState.get<string>('platform-sync.websocketUrl') || 'Default URL';
    
    switch (status) {
        case ConnectionStatus.CONNECTING:
            statusBarItem.text = `$(loading~spin) Platform Sync (${username})`;
            statusBarItem.tooltip = `Platform Sync: Connecting...\nURL: ${url}`;
            break;
        case ConnectionStatus.CONNECTED:
            statusBarItem.text = `$(sync) Platform Sync (${username})`;
            statusBarItem.tooltip = `Platform Sync: Connected\nURL: ${url}`;
            break;
        case ConnectionStatus.DISCONNECTED:
            statusBarItem.text = `$(sync-ignored) Platform Sync (${username})`;
            statusBarItem.tooltip = `Platform Sync: Disconnected\nURL: ${url}`;
            break;
        case ConnectionStatus.FAILED_TO_CONNECT:
            statusBarItem.text = `$(error) Platform Sync (${username})`;
            statusBarItem.tooltip = `Platform Sync: Failed to connect\nURL: ${url}`;
            break;
    }
}

function promptSetUsername() {
    vscode.window.showInformationMessage(
        'Platform Sync: Please set your reviewer username',
        'Set Username'
    ).then(selection => {
        if (selection === 'Set Username') {
            vscode.commands.executeCommand('platform-sync.setUsername');
        }
    });
}

export function deactivate() {
    console.log('Platform Sync Extension Deactivated');
    if (webSocketService) {
        webSocketService.disconnect();
    }
    
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
