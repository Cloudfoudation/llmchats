
// src/lib/sync/SyncQueue.ts
import { SyncOperation } from '@/types/sync';
import { storage } from './IndexedDBStorage';

export class SyncQueue {
	private queue: SyncOperation[] = [];
	private isProcessing = false;

	constructor(private syncProcessor: (op: SyncOperation) => Promise<void>) {
		this.loadPersistedQueue();
	}

	public async loadPersistedQueue() {
		try {
			const persistedQueue = await storage.getAll<SyncOperation>(storage.STORE_NAMES.SYNC_QUEUE);
			if (persistedQueue.length > 0) {
				this.queue = persistedQueue;
				await this.processNextBatch();
			}
		} catch (error) {
			console.error('Failed to load persisted queue:', error);
		}
	}

	async addToQueue(operation: SyncOperation): Promise<void> {
		this.queue.push(operation);
		await this.persistQueue();

		if (!this.isProcessing) {
			await this.processNextBatch();
		}
	}

	public async persistQueue(): Promise<void> {
		try {
			await storage.clear(storage.STORE_NAMES.SYNC_QUEUE);
			for (const op of this.queue) {
				await storage.set(storage.STORE_NAMES.SYNC_QUEUE, op.id, op);
			}
		} catch (error) {
			console.error('Failed to persist queue:', error);
		}
	}

	public async processNextBatch(): Promise<void> {
		if (this.isProcessing || this.queue.length === 0) return;
		await this.processQueue();
	}

	private async processQueue(): Promise<void> {
		console.log('Processing queue:', this.queue.length, 'operations');
		this.isProcessing = true;

		while (this.queue.length > 0) {
			const op = this.queue[0];
			try {
				await this.syncProcessor(op);
				this.queue.shift();
				await this.persistQueue();
			} catch (error) {
				if (op.retryCount < 3) {
					op.retryCount++;
					await this.delay(1000 * Math.pow(2, op.retryCount));
				} else {
					this.queue.shift();
					await this.addToFailedOperations(op);
				}
			}
		}

		this.isProcessing = false;
	}

	private async addToFailedOperations(op: SyncOperation): Promise<void> {
		try {
			await storage.set(storage.STORE_NAMES.FAILED_OPS, op.id, op);
		} catch (error) {
			console.error('Failed to save failed operation:', error);
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	// Public methods for queue management
	public getPendingCount(): number {
		return this.queue.length;
	}

	public async getFailedOperations(): Promise<SyncOperation[]> {
		return await storage.getAll(storage.STORE_NAMES.FAILED_OPS);
	}

	public async retryFailedOperation(operationId: string): Promise<void> {
		const failedOp = await storage.get<SyncOperation>(storage.STORE_NAMES.FAILED_OPS, operationId);
		if (failedOp) {
			failedOp.retryCount = 0;
			await storage.delete(storage.STORE_NAMES.FAILED_OPS, operationId);
			await this.addToQueue(failedOp);
		}
	}
}