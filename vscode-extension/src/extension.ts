import * as vscode from 'vscode';
import { VSCodeWebSocketService } from './websocket';
import { ConnectionConfig, ConnectionStatus, SyncMessage } from './types';
import * as path from 'path';

// Track if extension is activated
let isExtensionActive = false;
let statusBarItem: vscode.StatusBarItem;
let webSocketService: VSCodeWebSocketService;
let recentLine = -1;
let recentPath = '';

/**
 * This method is called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
    isExtensionActive = true;
    console.log('Platform Sync Extension Activated');

    try {
        // Create WebSocket service
        const config: ConnectionConfig = {
            url: 'wss://platform-sync-websocket.onrender.com',
            reconnectInterval: 5000,
            maxReconnectAttempts: 5
        };
        webSocketService = new VSCodeWebSocketService(config);
        
        // Set username if available
        const username = context.globalState.get<string>('platform-sync.username');
        if (username) {
            webSocketService.setUsername(username);
        }
        
        // Add WebSocket event listeners
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

        // Create status bar item
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.command = 'platform-sync.showMenu';
        context.subscriptions.push(statusBarItem);
        updateStatusBar(context, ConnectionStatus.DISCONNECTED);
        
        // Make sure to show the status bar
        statusBarItem.show();

        // Register commands
        registerCommands(context);
        
        // Setup file change detection and cursor movement tracking
        setupFileDetection(context);
        
        // Try to connect if username is set
        if (username) {
            webSocketService.connect();
        } else {
            vscode.window.showInformationMessage(
                'Platform Sync: Please set your reviewer username',
                'Set Username'
            ).then(selection => {
                if (selection === 'Set Username') {
                    vscode.commands.executeCommand('platform-sync.setUsername');
                }
            });
        }
    } catch (error) {
        console.error('Failed to activate Platform Sync extension:', error);
        vscode.window.showErrorMessage(`Platform Sync: Activation failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Register all extension commands
 */
function registerCommands(context: vscode.ExtensionContext) {
    // Show info command
    const showInfoCommand = vscode.commands.registerCommand('platform-sync.showInfo', () => {
        const username = context.globalState.get<string>('platform-sync.username') || 'Not set';
        const connectionStatus = webSocketService.isConnected() ? 'Connected' : 'Disconnected';
        vscode.window.showInformationMessage(`Platform Sync: Username: ${username}, Status: ${connectionStatus}`);
    });
    context.subscriptions.push(showInfoCommand);
    
    // Set username command
    const setUsernameCommand = vscode.commands.registerCommand('platform-sync.setUsername', async () => {
        const username = await vscode.window.showInputBox({
            prompt: 'Enter your reviewer username',
            placeHolder: 'username',
            value: context.globalState.get<string>('platform-sync.username') || ''
        });

        if (username) {
            await context.globalState.update('platform-sync.username', username);
            webSocketService.setUsername(username);
            vscode.window.showInformationMessage(`Username set to: ${username}`);
            updateStatusBar(context, webSocketService.isConnected() ? 
                ConnectionStatus.CONNECTED : ConnectionStatus.DISCONNECTED);
            
            // Connect after setting username
            if (!webSocketService.isConnected()) {
                webSocketService.connect();
            }
        }
    });
    context.subscriptions.push(setUsernameCommand);
    
    // Toggle connection command
    const toggleConnectionCommand = vscode.commands.registerCommand('platform-sync.toggleConnection', () => {
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
    });
    context.subscriptions.push(toggleConnectionCommand);
    
    // Show menu command
    const showMenuCommand = vscode.commands.registerCommand('platform-sync.showMenu', async () => {
        const isConnected = webSocketService.isConnected();
        const items = [
            { label: 'Set Username', description: 'Set your reviewer username' },
            { label: isConnected ? 'Disconnect' : 'Connect', description: isConnected ? 'Disconnect from sync server' : 'Connect to sync server' }
        ];
        
        const selection = await vscode.window.showQuickPick(items, {
            placeHolder: 'Platform Sync Menu'
        });
        
        if (selection) {
            switch (selection.label) {
                case 'Set Username':
                    vscode.commands.executeCommand('platform-sync.setUsername');
                    break;
                case 'Connect':
                case 'Disconnect':
                    vscode.commands.executeCommand('platform-sync.toggleConnection');
                    break;
            }
        }
    });
    context.subscriptions.push(showMenuCommand);
}

/**
 * Setup file detection and cursor movement tracking
 */
function setupFileDetection(context: vscode.ExtensionContext) {
    // Track active editor changes
    const activeEditorListener = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            processFileChange(editor, context);
        }
    });
    context.subscriptions.push(activeEditorListener);
    
    // Track cursor position changes
    const cursorPositionListener = vscode.window.onDidChangeTextEditorSelection(event => {
        processCursorChange(event, context);
    });
    context.subscriptions.push(cursorPositionListener);
    
    // Check initial active editor
    if (vscode.window.activeTextEditor) {
        processFileChange(vscode.window.activeTextEditor, context);
    }
}

/**
 * Process file change and send message to WebSocket if connected
 */
function processFileChange(editor: vscode.TextEditor, context: vscode.ExtensionContext) {
    if (!webSocketService.isConnected()) return;
    
    const username = context.globalState.get<string>('platform-sync.username');
    if (!username) return;
    
    // Get relative path from workspace folder
    const filePath = editor.document.uri.fsPath;
    let relativePath = filePath;
    
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        const workspaceFolder = workspaceFolders[0];
        relativePath = filePath.replace(workspaceFolder.uri.fsPath, '');
        
        // Get base project path (folder name only)
        const baseProjectPath = path.basename(workspaceFolder.uri.fsPath);
        
        // Format like IntelliJ plugin does
        const newPath = relativePath.replace(/[/\\]/g, '::');
        if (newPath !== recentPath) {
            recentPath = newPath;
            sendPathMessage(username, newPath);
        }
    }
}

/**
 * Process cursor change and send message to WebSocket if connected
 */
function processCursorChange(event: vscode.TextEditorSelectionChangeEvent, context: vscode.ExtensionContext) {
    if (!webSocketService.isConnected()) return;
    
    const username = context.globalState.get<string>('platform-sync.username');
    if (!username) return;
    
    // Get cursor line number (1-based like IntelliJ)
    const line = event.selections[0].active.line + 1;
    if (line !== recentLine) {
        recentLine = line;
        sendLineMessage(username, line);
    }
}

/**
 * Send path message to WebSocket
 */
function sendPathMessage(username: string, path: string) {
    if (!webSocketService.isConnected()) return;
    
    const message = `reviewerUsername===${username};path===${path}`;
    webSocketService.send({
        type: 'path',
        data: {
            username,
            filePath: path,
            line: -1
        },
        timestamp: new Date().toISOString()
    });
}

/**
 * Send line message to WebSocket
 */
function sendLineMessage(username: string, line: number) {
    if (!webSocketService.isConnected()) return;
    
    const message = `reviewerUsername===${username};line===${line}`;
    webSocketService.send({
        type: 'line',
        data: {
            username,
            filePath: '',
            line
        },
        timestamp: new Date().toISOString()
    });
}

/**
 * Update the status bar with connection status
 */
function updateStatusBar(context: vscode.ExtensionContext, status: ConnectionStatus) {
    if (!statusBarItem) return;
    
    const username = context.globalState.get<string>('platform-sync.username') || 'Not set';
    
    switch (status) {
        case ConnectionStatus.CONNECTED:
            statusBarItem.text = `$(sync) Platform Sync (${username})`;
            statusBarItem.tooltip = 'Platform Sync: Connected';
            break;
        case ConnectionStatus.DISCONNECTED:
            statusBarItem.text = `$(sync-ignored) Platform Sync (${username})`;
            statusBarItem.tooltip = 'Platform Sync: Disconnected';
            break;
        case ConnectionStatus.FAILED_TO_CONNECT:
            statusBarItem.text = `$(error) Platform Sync (${username})`;
            statusBarItem.tooltip = 'Platform Sync: Failed to connect';
            break;
    }
}

/**
 * This method is called when the extension is deactivated
 */
export function deactivate() {
    console.log('Platform Sync Extension Deactivated');
    if (webSocketService) {
        webSocketService.disconnect();
    }
    
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    
    isExtensionActive = false;
}
