export interface SyncMessage {
  type: 'PATH_CHANGE' | 'LINE_CHANGE';
  reviewerUsername: string;
  data: {
    path?: string;
    line?: number;
  };
  timestamp: number;
}

export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  FAILED_TO_CONNECT = 'FAILED_TO_CONNECT'
}

export interface ConnectionConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export interface WebSocketService {
  connect(config: ConnectionConfig): Promise<boolean>;
  disconnect(): void;
  sendMessage(message: SyncMessage): void;
  isConnected(): boolean;
  addChangeListener(listener: () => void): void;
  removeChangeListener(listener: () => void): void;
}

export interface StorageService {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error, ...args: any[]): void;
}
