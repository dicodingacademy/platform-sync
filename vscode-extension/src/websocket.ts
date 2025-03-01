import WebSocket from 'ws';
import { ConnectionConfig, SyncMessage, WebSocketService } from './types';

export class VSCodeWebSocketService implements WebSocketService {
    private ws: WebSocket | null = null;
    private connected = false;
    private reconnectAttempts = 0;
    private eventListeners: { [key: string]: ((data: any) => void)[] } = {};

    constructor(private config: ConnectionConfig) {}

    connect(): void {
        if (this.connected) {
            return;
        }

        try {
            this.ws = new WebSocket(this.config.url);
            this.setupWebSocketHandlers();
        } catch (error) {
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
                const messageString = JSON.stringify(message);
                this.ws.send(messageString);
            } catch (error) {
                console.error('Failed to send message:', error);
            }
        }
    }

    isConnected(): boolean {
        return this.connected;
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
                const message = JSON.parse(data.toString());
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
            this.emit('error', error);
        });
    }

    private handleReconnect(): void {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            return;
        }

        this.reconnectAttempts++;

        setTimeout(() => {
            this.connect();
        }, this.config.reconnectInterval);
    }
}
