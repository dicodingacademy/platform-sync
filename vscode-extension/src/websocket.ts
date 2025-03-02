import WebSocket from 'ws';
import { ConnectionConfig, SyncMessage, WebSocketService } from './types';

export class VSCodeWebSocketService implements WebSocketService {
    private ws: WebSocket | null = null;
    private connected = false;
    private reconnectAttempts = 0;
    private eventListeners: { [key: string]: ((data: any) => void)[] } = {};
    private username: string | null = null;

    constructor(private config: ConnectionConfig) {}

    connect(): void {
        if (this.connected) {
            return;
        }

        try {
            this.ws = new WebSocket(this.config.url);
            this.setupWebSocketHandlers();
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.handleReconnect();
        }
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.connected = false;
            this.emit('disconnected');
        }
    }

    send(message: SyncMessage): void {
        if (this.ws && this.connected) {
            try {
                // Format: "reviewerUsername===username;key===value"
                let messageString = '';
                
                if (message.type === 'path') {
                    messageString = `reviewerUsername===${message.data.username};path===${message.data.filePath}`;
                } else if (message.type === 'line') {
                    messageString = `reviewerUsername===${message.data.username};line===${message.data.line}`;
                } else {
                    messageString = JSON.stringify(message);
                }
                
                this.ws.send(messageString);
            } catch (error) {
                console.error('Failed to send message:', error);
            }
        }
    }

    isConnected(): boolean {
        return this.connected;
    }

    setUsername(username: string): void {
        this.username = username;
    }

    on(event: string, callback: (data: any) => void): void {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    private emit(event: string, data?: any): void {
        const listeners = this.eventListeners[event];
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    private setupWebSocketHandlers(): void {
        if (!this.ws) {
            return;
        }
        
        this.ws.on('open', () => {
            this.connected = true;
            this.reconnectAttempts = 0;
            this.emit('connected');
        });

        this.ws.on('message', (data: WebSocket.Data) => {
            try {
                let message: any;
                const dataString = data.toString();

                if (dataString.includes('===')) {
                    // Format: key===value;key2===value2
                    message = this.parseFormattedMessage(dataString);
                } else {
                    message = JSON.parse(dataString);
                }

                this.emit('message', message);
            } catch (error) {
                console.error('Failed to parse message:', error);
            }
        });

        this.ws.on('close', () => {
            this.connected = false;
            this.emit('disconnected');
            this.handleReconnect();
        });

        this.ws.on('error', (error: Error) => {
            console.error('WebSocket error:', error);
            this.emit('error', error);
        });
    }

    private parseFormattedMessage(messageString: string): any {
        const result: any = {};
        const parts = messageString.split(';');
        
        for (const part of parts) {
            if (part.includes('===')) {
                const [key, value] = part.split('===');
                result[key] = value;
            }
        }
        
        return result;
    }

    private handleReconnect(): void {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('error', new Error('Max reconnection attempts reached'));
            return;
        }

        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

        setTimeout(() => {
            this.connect();
        }, this.config.reconnectInterval);
    }
}
