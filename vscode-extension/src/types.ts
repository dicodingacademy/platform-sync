import WebSocket from 'ws';

export interface SyncMessageData {
  username: string;
  filePath: string;
  line: number;
}

export interface SyncMessage {
  type: string;
  data: {
    username: string;
    filePath: string;
    line: number;
  };
  timestamp: string;
}

export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  FAILED_TO_CONNECT = 'FAILED_TO_CONNECT'
}

export interface ConnectionConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

export interface WebSocketService {
  connect(): void;
  disconnect(): void;
  send(message: SyncMessage): void;
  isConnected(): boolean;
  on(event: 'message', callback: (data: SyncMessage) => void): void;
  on(event: 'connected' | 'disconnected', callback: () => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
}

export interface StorageService {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
}

export interface Logger {
  info(message: string): void;
  error(message: string, error?: Error): void;
  warn(message: string): void;
  debug(message: string): void;
}
