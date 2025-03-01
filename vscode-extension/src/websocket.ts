import { WebSocket } from 'ws';
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
                this.ws.send(JSON.stringify(message));
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
            listeners.forEach(callback => callback(data));
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

        this.ws.on('message', (data: Buffer) => {
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

        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', error);
            this.handleReconnect();
        });
    }

    private handleReconnect(): void {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

        setTimeout(() => {
            this.connect();
        }, this.config.reconnectInterval);
    }
}
