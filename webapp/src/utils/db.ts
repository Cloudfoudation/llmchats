import { FormSelectionState, AppSettings, defaultSettings } from '@/types';

interface StoredModelPreference {
	modelId: string;
	parameters: {
		temperature: number;
		topP: number;
		maxTokens: number;
		[key: string]: any;
	};
}

interface AvailableModels {
	models: any[];
	region: string;
}

class CredentialsDB {
	private dbName = 'ChatAppDB';
	private modelStore = 'modelPreferences';
	private formStateStore = 'formState';
	private availableModelsStore = 'availableModels';
	private settingsStore = 'settings';
	private version = 9;

	async initDB(): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.version);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;

				// Create model preferences store if it doesn't exist
				if (!db.objectStoreNames.contains(this.modelStore)) {
					db.createObjectStore(this.modelStore);
				}

				if (!db.objectStoreNames.contains(this.formStateStore)) {
					db.createObjectStore(this.formStateStore);
				}

				if (!db.objectStoreNames.contains(this.availableModelsStore)) {
					db.createObjectStore(this.availableModelsStore);
				}

				if (!db.objectStoreNames.contains(this.settingsStore)) {
					db.createObjectStore(this.settingsStore);
				}
			};
		});
	}

	async clearAll(): Promise<void> {
		const db = await this.initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(
				[
					this.modelStore,
					this.formStateStore,
					this.availableModelsStore,
					this.settingsStore,
				],
				'readwrite'
			);

			const stores = [
				this.modelStore,
				this.formStateStore,
				this.availableModelsStore,
				this.settingsStore,
			];

			let completed = 0;

			stores.forEach(storeName => {
				const store = transaction.objectStore(storeName);
				const request = store.clear();

				request.onerror = () => reject(request.error);
				request.onsuccess = () => {
					completed++;
					if (completed === stores.length) {
						resolve();
					}
				};
			});

			transaction.onerror = () => reject(transaction.error);
		});
	}

	async saveModelPreference(preference: StoredModelPreference): Promise<void> {
		const db = await this.initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(this.modelStore, 'readwrite');
			const store = transaction.objectStore(this.modelStore);
			const request = store.put(preference, 'currentModel');

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async getModelPreference(): Promise<StoredModelPreference | null> {
		const db = await this.initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(this.modelStore, 'readonly');
			const store = transaction.objectStore(this.modelStore);
			const request = store.get('currentModel');

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result || null);
		});
	}

	async saveFormState(state: FormSelectionState): Promise<void> {
		const db = await this.initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(this.formStateStore, 'readwrite');
			const store = transaction.objectStore(this.formStateStore);
			const request = store.put(state, 'currentFormState');

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async getFormState(): Promise<FormSelectionState | null> {
		const db = await this.initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(this.formStateStore, 'readonly');
			const store = transaction.objectStore(this.formStateStore);
			const request = store.get('currentFormState');

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result || null);
		});
	}

	async saveAvailableModels(models: AvailableModels): Promise<void> {
		const db = await this.initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(this.availableModelsStore, 'readwrite');
			const store = transaction.objectStore(this.availableModelsStore);
			const request = store.put(models, models.region);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async getAvailableModels(region: string): Promise<AvailableModels | null> {
		const db = await this.initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(this.availableModelsStore, 'readonly');
			const store = transaction.objectStore(this.availableModelsStore);
			const request = store.get(region);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result || null);
		});
	}

	async saveSettings(settings: AppSettings): Promise<void> {
		const db = await this.initDB();
		await new Promise((resolve, reject) => {
			const transaction = db.transaction(this.settingsStore, 'readwrite');
			const store = transaction.objectStore(this.settingsStore);

			const settingsToStore = {
				...settings,
				externalApiKeys: settings.externalApiKeys || defaultSettings.externalApiKeys
			};

			const request = store.put(settingsToStore, 'appSettings');

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(undefined);
		});
	}

	async getSettings(): Promise<AppSettings | null> {
		const db = await this.initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(this.settingsStore, 'readonly');
			const store = transaction.objectStore(this.settingsStore);
			const request = store.get('appSettings');

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				if (!request.result) {
					resolve(defaultSettings);
					return;
				}

				const settings: AppSettings = {
					isSidebarVisible: request.result.isSidebarVisible ?? defaultSettings.isSidebarVisible,
					region: request.result.region ?? defaultSettings.region,
					defaultModelParams: request.result.defaultModelParams ?? defaultSettings.defaultModelParams,
					externalApiKeys: request.result.externalApiKeys ?? defaultSettings.externalApiKeys
				};

				resolve(settings);
			}
		});
	}
}

export const credentialsDB = new CredentialsDB();
export type { StoredModelPreference };