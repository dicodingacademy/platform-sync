import * as vscode from 'vscode';

// Track if extension is activated
let isExtensionActive = false;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    isExtensionActive = true;
    console.log('Platform Sync Extension Activated');

    try {
        // Create a simple status bar item
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.text = "$(sync) Platform Sync";
        statusBarItem.tooltip = "Platform Sync Extension";
        statusBarItem.command = 'platform-sync.showInfo';
        context.subscriptions.push(statusBarItem);
        
        // Make sure to show the status bar
        statusBarItem.show();
        console.log('Status bar item created and shown');

        // Register a simple command
        const showInfoCommand = vscode.commands.registerCommand('platform-sync.showInfo', () => {
            vscode.window.showInformationMessage('Platform Sync Extension is active!');
        });
        context.subscriptions.push(showInfoCommand);
        console.log('Registered platform-sync.showInfo command');

        // Register username command
        const setUsernameCommand = vscode.commands.registerCommand('platform-sync.setUsername', async () => {
            const username = await vscode.window.showInputBox({
                prompt: 'Enter your reviewer username',
                placeHolder: 'username'
            });

            if (username) {
                await context.globalState.update('platform-sync.username', username);
                vscode.window.showInformationMessage(`Username set to: ${username}`);
            }
        });
        context.subscriptions.push(setUsernameCommand);
        console.log('Registered platform-sync.setUsername command');

        // Check command availability after a short delay
        setTimeout(() => {
            vscode.commands.getCommands(true).then(allCommands => {
                const ourCommands = allCommands.filter(cmd => cmd.startsWith('platform-sync.'));
                console.log("Available platform-sync commands:", ourCommands);
                
                // Force status bar display
                statusBarItem.show();
                console.log("Status bar display forced");
            });
        }, 2000);

    } catch (error) {
        console.error('Failed to activate Platform Sync extension:', error);
        vscode.window.showErrorMessage(`Platform Sync: Activation failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function deactivate() {
    console.log('Platform Sync Extension Deactivated');
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    isExtensionActive = false;
}
