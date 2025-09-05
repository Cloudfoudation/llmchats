// src/lib/sync/SyncManager.ts
import { dynamoSync } from '@/services/sync/DynamoDBSync';
import { storage } from './IndexedDBStorage';
import { SyncQueue } from './SyncQueue';
import { SyncableEntity, SyncOperation, SyncStatus } from '@/types/sync';
import { v4 as uuid } from 'uuid';
import { Conversation } from '@/types/chat';
import { Agent } from '@/types/agent';

type SyncSubscriber = (status: SyncStatus) => void;

export class SyncManager {

    private static readonly BATCH_SIZE = 10;

    private syncQueue: SyncQueue;
    private subscribers: Set<SyncSubscriber> = new Set();
    private status: SyncStatus = SyncStatus.IDLE;
    private initialized: boolean = false;
    private userId: string | null = null;

    constructor() {
        this.syncQueue = new SyncQueue(this.processSyncOperation.bind(this));
    }
    private async initializeStorage() {
        try {
            await storage.init();
        } catch (error) {
            console.error('Failed to initialize storage:', error);
            throw error;
        }
    }

    async initialize(userId: string): Promise<void> {
        if (this.initialized) {
            console.warn('SyncManager already initialized');
            return;
        }

        try {
            this.updateStatus(SyncStatus.INITIALIZING);

            // Initialize storage first
            await this.initializeStorage();

            // Initialize DynamoDB sync
            await dynamoSync.initialize(userId);
            this.userId = userId;

            // Load any pending operations from storage
            await this.syncQueue.loadPersistedQueue();

            this.initialized = true;
            this.updateStatus(SyncStatus.IDLE);
        } catch (error) {
            this.updateStatus(SyncStatus.ERROR);
            console.error('Failed to initialize SyncManager:', error);
            throw error;
        }
    }

    /**
     * Perform initial sync between local and remote data
     */
    async performInitialSync(): Promise<void> {
        console.log('Performing initial sync with batch processing')
        if (!this.initialized) {
            throw new Error('SyncManager not initialized');
        }

        try {
            this.updateStatus(SyncStatus.SYNCING);

            // Fetch agents (smaller dataset, can fetch all at once)
            const remoteAgents = await dynamoSync.fetchAllEntities(
                process.env.NEXT_PUBLIC_AGENTS_TABLE!,
                dynamoSync.unmarshallAgent.bind(dynamoSync)
            );
            const localAgents = await storage.getAll<Agent>('agents');
            await this.mergeAndSyncData('agents', localAgents, remoteAgents);

            // For conversations, fetch and process in batches
            await this.performBatchedConversationSync();

            this.updateStatus(SyncStatus.INITIAL_SYNC_SUCCESS);
        } catch (error) {
            this.updateStatus(SyncStatus.ERROR);
            console.error('Initial sync failed:', error);
            throw error;
        }
    }

    /**
     * Perform batched conversation sync with progressive updates
     */
    private async performBatchedConversationSync(): Promise<void> {
        try {
            // First, get all conversation metadata
            const conversationMetadata = await dynamoSync.fetchAllConversationMetadata();
            const localConversations = await storage.getAll<Conversation>('conversations');

            // Create a map of local conversations for easy lookup
            const localConversationMap = new Map(
                localConversations.map(conv => [conv.id, conv])
            );

            // Identify conversations that need to be fetched
            const conversationsToFetch: Array<{ id: string; version: number }> = [];
            const conversationsToKeep: Conversation[] = [];

            for (const metadata of conversationMetadata) {
                const localConv = localConversationMap.get(metadata.id);

                if (!localConv || localConv.version !== metadata.version) {
                    conversationsToFetch.push({
                        id: metadata.id,
                        version: metadata.version
                    });
                } else {
                    // Keep local version if versions match
                    conversationsToKeep.push(localConv);
                }
            }

            // Save conversations we're keeping immediately
            for (const conv of conversationsToKeep) {
                await storage.set('conversations', conv.id, conv);
            }

            // Notify that we have some conversations ready
            this.updateStatus(SyncStatus.PARTIAL_SYNC_SUCCESS);

            // Process conversations to fetch in batches
            await this.processBatchedConversations(conversationsToFetch, localConversationMap);

        } catch (error) {
            console.error('Batched conversation sync failed:', error);
            throw error;
        }
    }

    /**
     * Process conversations in batches
     */
    private async processBatchedConversations(
        conversationsToFetch: Array<{ id: string; version: number }>,
        localConversationMap: Map<string, Conversation>
    ): Promise<void> {
        const batches = this.createBatches(conversationsToFetch, SyncManager.BATCH_SIZE);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`Processing conversation batch ${i + 1}/${batches.length}`);

            try {
                // Fetch conversations in current batch
                const batchPromises = batch.map(({ id }) =>
                    dynamoSync.fetchConversation(id)
                );

                const fetchedConversations = await Promise.all(batchPromises);

                // Process each conversation in the batch
                for (let j = 0; j < fetchedConversations.length; j++) {
                    const fetchedConv = fetchedConversations[j];
                    const { id } = batch[j];

                    if (fetchedConv) {
                        const localConv = localConversationMap.get(id);
                        let finalConversation = fetchedConv;

                        // Resolve conflicts if local version exists
                        if (localConv) {
                            finalConversation = await this.resolveConflict(localConv, fetchedConv);
                        }

                        // Save to local storage
                        await storage.set('conversations', finalConversation.id, finalConversation);
                    }
                }

                // Notify subscribers about batch completion
                this.updateStatus(SyncStatus.BATCH_SYNC_PROGRESS);

                // Small delay between batches to prevent overwhelming the system
                if (i < batches.length - 1) {
                    await this.delay(100);
                }

            } catch (error) {
                console.error(`Failed to process batch ${i + 1}:`, error);
                // Continue with next batch even if current fails
            }
        }
    }

    /**
     * Create batches from array
     */
    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Delay utility for batch processing
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Add new method that accepts pre-fetched data
    private async mergeAndSyncDataWithCache<T extends SyncableEntity>(
        storeName: string,
        localItems: T[],
        remoteItems: T[],
        itemsToSync?: Set<string>
    ): Promise<void> {
        const mergedItems = new Map<string, T>();

        // Add all remote items to merged items
        remoteItems.forEach(item => mergedItems.set(item.id, item));

        // Handle local items that might need syncing
        for (const localItem of localItems) {
            const remoteItem = mergedItems.get(localItem.id);
            if (!remoteItem) {
                // Item doesn't exist remotely, sync it
                mergedItems.set(localItem.id, localItem);
                await this.sync(localItem, 'CREATE');
            } else if (itemsToSync?.has(localItem.id)) {
                // We already know this item needs syncing
                const resolvedItem = await this.resolveConflict(localItem, remoteItem);
                mergedItems.set(localItem.id, resolvedItem);
            }
            // If not in itemsToSync, keep the existing version
        }

        // Save merged items to local storage
        for (const item of mergedItems.values()) {
            await storage.set(storeName, item.id, item);
        }
    }

    /**
     * Clean up resources and prepare for shutdown
     */
    async cleanup(): Promise<void> {
        try {
            // Persist any pending operations
            await this.syncQueue.persistQueue();

            // Clear runtime state
            this.subscribers.clear();
            this.initialized = false;
            this.userId = null;
            this.status = SyncStatus.IDLE;

            // Optional: Clear sensitive data
            await storage.clear('credentials');
        } catch (error) {
            console.error('Cleanup failed:', error);
            throw error;
        }
    }

    private getEntityType(entity: any): SyncOperation['entity'] {
        // Implement logic to determine entity type
        if ('messages' in entity) return 'conversation';
        return 'agent';
    }

    async sync<T extends SyncableEntity>(entity: T, type: SyncOperation['type']): Promise<void> {
        if (!this.initialized) {
            throw new Error('SyncManager not initialized');
        }

        // Create sync operation
        const operation: SyncOperation = {
            id: uuid(),
            type,
            entity: this.getEntityType(entity),
            data: entity,
            timestamp: Date.now(),
            retryCount: 0
        };

        try {
            // Update status
            this.updateStatus(SyncStatus.SYNCING);

            // Save to local storage first
            const storeName = this.getStoreName(operation.entity);
            if (type === 'DELETE') {
                await storage.delete(storeName, entity.id);
            } else {
                await storage.set(storeName, entity.id, entity);
            }

            // Add to sync queue for remote synchronization
            await this.syncQueue.addToQueue(operation);

            // Update status
            this.updateStatus(SyncStatus.SUCCESS);
        } catch (error) {
            this.updateStatus(SyncStatus.ERROR);
            console.error('Sync operation failed:', error);
            throw error;
        }
    }

    // Helper method to get storage name
    private getStoreName(entityType: string): string {
        switch (entityType) {
            case 'agent':
                return 'agents';
            case 'conversation':
                return 'conversations';
            default:
                throw new Error(`Unknown entity type: ${entityType}`);
        }
    }

    /**
     * Merge local and remote data with conflict resolution
     */
    private async mergeAndSyncData<T extends SyncableEntity>(
        storeName: string,
        localItems: T[],
        remoteItems: T[]
    ): Promise<void> {
        // For conversations, use the cached version
        if (storeName === 'conversations') {
            return this.mergeAndSyncDataWithCache(storeName, localItems, remoteItems);
        }

        // Original logic for other entity types
        const mergedItems = new Map<string, T>();
        remoteItems.forEach(item => mergedItems.set(item.id, item));

        for (const localItem of localItems) {
            const remoteItem = mergedItems.get(localItem.id);
            if (remoteItem) {
                mergedItems.set(localItem.id, await this.resolveConflict(localItem, remoteItem));
            } else {
                mergedItems.set(localItem.id, localItem);
                await this.sync(localItem, 'CREATE');
            }
        }

        // Save merged items to local storage
        for (const item of mergedItems.values()) {
            await storage.set(storeName, item.id, item);
        }
    }

    /**
     * Resolve conflict between local and remote versions of an entity
     */
    private async resolveConflict<T extends SyncableEntity>(local: T, remote: T): Promise<T> {
        if (local.version > remote.version) {
            // Local is newer, sync to remote
            await this.sync(local, 'UPDATE');
            return local;
        } else if (remote.version > local.version) {
            // Remote is newer
            return remote;
        } else {
            // Same version, compare timestamps
            return local.lastEditedAt > remote.lastEditedAt ? local : remote;
        }
    }

    /**
     * Process a single sync operation
     */
    private async processSyncOperation(operation: SyncOperation): Promise<void> {
        if (!this.initialized) {
            throw new Error('SyncManager not initialized');
        }

        try {
            switch (operation.type) {
                case 'CREATE':
                case 'UPDATE':
                    if (operation.entity === 'conversation') {
                        await dynamoSync.syncConversation(operation.data as Conversation);
                    } else {
                        await dynamoSync.syncEntity(
                            operation.data,
                            this.getTableName(operation.entity),
                            this.getMarshallFunction(operation.entity)
                        );
                    }
                    break;
                case 'DELETE':
                    if (operation.entity === 'conversation') {
                        await dynamoSync.deleteConversation(operation.data.id);
                    } else {
                        await dynamoSync.deleteEntity(
                            operation.data.id,
                            this.getTableName(operation.entity)
                        );
                    }
                    break;
            }
        } catch (error) {
            console.error('Operation processing failed:', error);
            throw error;
        }
    }

    /**
     * Get the appropriate DynamoDB table name for an entity type
     */
    private getTableName(entityType: string): string {
        switch (entityType) {
            case 'agent':
                return process.env.NEXT_PUBLIC_AGENTS_TABLE!;
            case 'conversation':
                return process.env.NEXT_PUBLIC_CONVERSATIONS_TABLE!;
            default:
                throw new Error(`Unknown entity type: ${entityType}`);
        }
    }

    private getMarshallFunction(entityType: string): (item: any) => Record<string, any> {
        switch (entityType) {
            case 'agent':
                return dynamoSync.marshallAgent.bind(dynamoSync);
            default:
                throw new Error(`Unknown entity type: ${entityType}`);
        }
    }

    // Subscription management
    public subscribe(callback: SyncSubscriber): () => void {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    private updateStatus(status: SyncStatus) {
        this.status = status;
        this.notifySubscribers();
    }

    private notifySubscribers() {
        this.subscribers.forEach(subscriber => subscriber(this.status));
    }

    public getStatus(): SyncStatus {
        return this.status;
    }
}