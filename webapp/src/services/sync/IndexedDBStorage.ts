// src/lib/sync/storage.ts
interface StorageItem<T> {
    id: string;
    value: T;
    timestamp: number;
    expiry?: number;
}

export class IndexedDBStorage {
    private db: IDBDatabase | null = null;
    private readonly DB_NAME = 'syncStorage';
    private readonly DB_VERSION = 3;
    private initPromise: Promise<void> | null = null;

    // Store configurations similar to db.ts
    public readonly STORE_NAMES = {
        SYNC_QUEUE: 'syncQueue',
        SYNC_STATE: 'syncState',
        FAILED_OPS: 'failedOperations',
        CONVERSATIONS: 'conversations',
        AGENTS: 'agents',
    };

    async initDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create stores with indexes
                if (!db.objectStoreNames.contains(this.STORE_NAMES.CONVERSATIONS)) {
                    const conversationStore = db.createObjectStore(this.STORE_NAMES.CONVERSATIONS, {
                        keyPath: 'id'
                    });
                    conversationStore.createIndex('lastEditedAt', 'value.lastEditedAt', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.STORE_NAMES.AGENTS)) {
                    db.createObjectStore(this.STORE_NAMES.AGENTS, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(this.STORE_NAMES.SYNC_QUEUE)) {
                    db.createObjectStore(this.STORE_NAMES.SYNC_QUEUE, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(this.STORE_NAMES.SYNC_STATE)) {
                    db.createObjectStore(this.STORE_NAMES.SYNC_STATE);
                }

                if (!db.objectStoreNames.contains(this.STORE_NAMES.FAILED_OPS)) {
                    const failedOpsStore = db.createObjectStore(this.STORE_NAMES.FAILED_OPS, { keyPath: 'id' });
                    failedOpsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    async init(): Promise<void> {
        if (this.initPromise) return this.initPromise;

        this.initPromise = this.initDB().then(db => {
            this.db = db;
        });

        return this.initPromise;
    }

    isInitialized(): boolean {
        return this.db !== null;
    }

    async set<T>(storeName: string, key: string, value: T, ttl?: number): Promise<void> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            const item: StorageItem<T> = {
                id: key,
                value,
                timestamp: Date.now(),
                expiry: ttl ? Date.now() + ttl : undefined
            };

            const request = store.put(item);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async get<T>(storeName: string, key: string): Promise<T | null> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const item = request.result as StorageItem<T> | undefined;

                if (!item) return resolve(null);

                if (item.expiry && item.expiry < Date.now()) {
                    this.delete(storeName, key).catch(console.error);
                    return resolve(null);
                }

                resolve(item.value);
            };
        });
    }

    async delete(storeName: string, key: string): Promise<void> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async clearAll(): Promise<void> {
        this.clear(this.STORE_NAMES.CONVERSATIONS)
            .then(() => this.clear(this.STORE_NAMES.AGENTS))
            .then(() => this.clear(this.STORE_NAMES.SYNC_QUEUE))
            .then(() => this.clear(this.STORE_NAMES.SYNC_STATE))
            .then(() => this.clear(this.STORE_NAMES.FAILED_OPS));
    }

    async clear(storeName: string): Promise<void> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async getAll<T>(storeName: string): Promise<T[]> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const items = request.result as StorageItem<T>[];
                const now = Date.now();

                const validItems = items
                    .filter(item => !item.expiry || item.expiry > now)
                    .map(item => item.value);

                resolve(validItems);
            };
        });
    }
}

// Create and export singleton instance
export const storage = new IndexedDBStorage();