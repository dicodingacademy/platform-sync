import { WebSocketServer } from 'ws';
import { SyncMessage, Logger } from '@platform-sync/shared';

class ConsoleLogger implements Logger {
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

class PlatformSyncServer {
  private wss: WebSocketServer;
  private logger: Logger;
  private clients: Map<string, WebSocket> = new Map();

  constructor(port: number, logger: Logger) {
    this.logger = logger;
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws) => {
      this.logger.info('Client connected');

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as SyncMessage;
          this.handleMessage(ws, message);
        } catch (error) {
          this.logger.error('Failed to parse message', error as Error);
        }
      });

      ws.on('close', () => {
        this.logger.info('Client disconnected');
        this.removeClient(ws);
      });

      ws.on('error', (error) => {
        this.logger.error('WebSocket error', error);
        this.removeClient(ws);
      });
    });

    this.wss.on('error', (error) => {
      this.logger.error('WebSocket server error', error);
    });
  }

  private handleMessage(ws: WebSocket, message: SyncMessage): void {
    const { reviewerUsername } = message;

    // Update client mapping
    this.clients.set(reviewerUsername, ws);

    // Broadcast to all other clients
    this.clients.forEach((client, username) => {
      if (username !== reviewerUsername && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });

    this.logger.debug('Message handled', message);
  }

  private removeClient(ws: WebSocket): void {
    this.clients.forEach((client, username) => {
      if (client === ws) {
        this.clients.delete(username);
      }
    });
  }
}

const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const logger = new ConsoleLogger();
new PlatformSyncServer(port, logger);

logger.info(`WebSocket server started on port ${port}`);
