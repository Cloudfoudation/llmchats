// src/sync/types.ts

export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  PARTIAL_SYNC_SUCCESS = 'partial_sync_success',
  BATCH_SYNC_PROGRESS = 'batch_sync_progress',
  ERROR = 'error',
  SUCCESS = 'success',
  INITIALIZING = 'initializing',
  INITIAL_SYNC_SUCCESS = 'initialSyncSuccess'
}

export type SyncSubscriber = (status: SyncStatus) => void;

export interface SyncableEntity {
  id: string;
  version: number;
  lastEditedAt: number;
  deleted?: boolean;
}

export interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'conversation' | 'agent';
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface SyncState {
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingChanges: number;
  syncError: Error | null;
}