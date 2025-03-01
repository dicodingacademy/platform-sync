import { WebSocketServer, WebSocket } from 'ws';
import { SyncMessage, Logger, ConnectionConfig, WebSocketService } from './types';

class ConsoleLogger implements Logger {
  debug(message: string): void {
    console.debug(message);
  }

  info(message: string): void {
    console.info(message);
  }

  warn(message: string): void {
    console.warn(message);
  }

  error(message: string, error?: Error): void {
    console.error(message, error);
  }
}

class WebSocketServiceImpl implements WebSocketService {
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

    this.ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
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

class WebSocketServerImpl {
  private wss: WebSocketServer;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    console.log(`WebSocket server is running on port ${port}`);
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected');

      ws.on('message', (data: Buffer) => {
        try {
          const message: SyncMessage = JSON.parse(data.toString());
          console.log('Received message:', message);

          // Broadcast message to all other clients
          this.wss.clients.forEach(client => {
            if (client !== ws && client.readyState === 1) { // 1 = OPEN
              client.send(JSON.stringify(message));
            }
          });
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
      });

      ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
      });
    });
  }
}

const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
new WebSocketServerImpl(port);
