import WebSocket from 'ws';
import { WebSocketService, ConnectionConfig, ConnectionStatus, SyncMessage, Logger } from './types';

export abstract class BaseWebSocketService implements WebSocketService {
  protected ws: WebSocket | null = null;
  protected listeners: Array<() => void> = [];
  protected config: ConnectionConfig | null = null;
  protected reconnectTimeout: NodeJS.Timeout | null = null;
  protected reconnectAttempts = 0;
  protected logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async connect(config: ConnectionConfig): Promise<boolean> {
    this.config = config;
    return this.establishConnection();
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.clearReconnectTimeout();
      this.onConnectionChange(ConnectionStatus.DISCONNECTED);
    }
  }

  sendMessage(message: SyncMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          ...message,
          timestamp: Date.now()
        }));
      } catch (error) {
        this.logger.error('Failed to send message', error as Error);
      }
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  addChangeListener(listener: () => void): void {
    this.listeners.push(listener);
  }

  removeChangeListener(listener: () => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  protected notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        this.logger.error('Error in listener', error as Error);
      }
    });
  }

  protected abstract onConnectionChange(status: ConnectionStatus): void;

  private async establishConnection(): Promise<boolean> {
    if (!this.config) {
      throw new Error('Connection config not set');
    }

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.on('open', () => {
        this.logger.info('WebSocket connected');
        this.reconnectAttempts = 0;
        this.onConnectionChange(ConnectionStatus.CONNECTED);
      });

      this.ws.on('close', () => {
        this.logger.info('WebSocket closed');
        this.onConnectionChange(ConnectionStatus.DISCONNECTED);
        this.attemptReconnect();
      });

      this.ws.on('error', (error) => {
        this.logger.error('WebSocket error', error);
        this.onConnectionChange(ConnectionStatus.FAILED_TO_CONNECT);
        this.attemptReconnect();
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to establish WebSocket connection', error as Error);
      this.onConnectionChange(ConnectionStatus.FAILED_TO_CONNECT);
      return false;
    }
  }

  private attemptReconnect(): void {
    if (!this.config?.reconnectAttempts || this.reconnectAttempts >= this.config.reconnectAttempts) {
      return;
    }

    this.clearReconnectTimeout();
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.config?.reconnectAttempts})`);
      this.establishConnection();
    }, this.config.reconnectInterval || 5000);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}
