import { WebSocket } from 'ws';

export interface SyncMessageData {
  username: string;
  filePath: string;
  line: number;
}

export interface SyncMessage {
  type: 'file_change' | 'cursor_change';
  data: SyncMessageData;
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
  on(event: string, callback: (data: any) => void): void;
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

export type { WebSocket };
