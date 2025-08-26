import { DeployedToken, IncompleteDeployment } from "@/types";

const DB_NAME = "stx-city-mini";
const DB_VERSION = 2;
const TOKENS_STORE = "tokens";
const INCOMPLETE_STORE = "incomplete_deployments";

class IndexedDBManager {
	private db: IDBDatabase | null = null;

	async init(): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				this.db = request.result;
				resolve();
			};

			request.onupgradeneeded = () => {
				const db = request.result;

				// Create tokens store
				if (!db.objectStoreNames.contains(TOKENS_STORE)) {
					const store = db.createObjectStore(TOKENS_STORE, {
						keyPath: "id",
					});
					store.createIndex("deployedBy", "deployedBy", {
						unique: false,
					});
					store.createIndex("deployedAt", "deployedAt", {
						unique: false,
					});
				}

				// Create incomplete deployments store
				if (!db.objectStoreNames.contains(INCOMPLETE_STORE)) {
					const incompleteStore = db.createObjectStore(
						INCOMPLETE_STORE,
						{
							keyPath: "id",
						}
					);
					incompleteStore.createIndex("deployedBy", "deployedBy", {
						unique: false,
					});
					incompleteStore.createIndex("createdAt", "createdAt", {
						unique: false,
					});
				}
			};
		});
	}

	async saveToken(token: DeployedToken): Promise<void> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(
				[TOKENS_STORE],
				"readwrite"
			);
			const store = transaction.objectStore(TOKENS_STORE);
			const request = store.put(token);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async getTokensByOwner(ownerAddress: string): Promise<DeployedToken[]> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(
				[TOKENS_STORE],
				"readonly"
			);
			const store = transaction.objectStore(TOKENS_STORE);
			const index = store.index("deployedBy");
			const request = index.getAll(ownerAddress);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result || []);
		});
	}

	async getAllTokens(): Promise<DeployedToken[]> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(
				[TOKENS_STORE],
				"readonly"
			);
			const store = transaction.objectStore(TOKENS_STORE);
			const request = store.getAll();

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result || []);
		});
	}

	async updateToken(
		tokenId: string,
		updates: Partial<DeployedToken>
	): Promise<void> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(
				[TOKENS_STORE],
				"readwrite"
			);
			const store = transaction.objectStore(TOKENS_STORE);
			const getRequest = store.get(tokenId);

			getRequest.onsuccess = () => {
				const existingToken = getRequest.result;
				if (existingToken) {
					const updatedToken = { ...existingToken, ...updates };
					const putRequest = store.put(updatedToken);
					putRequest.onsuccess = () => resolve();
					putRequest.onerror = () => reject(putRequest.error);
				} else {
					reject(new Error("Token not found"));
				}
			};

			getRequest.onerror = () => reject(getRequest.error);
		});
	}

	async deleteToken(tokenId: string): Promise<void> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(
				[TOKENS_STORE],
				"readwrite"
			);
			const store = transaction.objectStore(TOKENS_STORE);
			const request = store.delete(tokenId);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	// Incomplete deployment methods
	async saveIncompleteDeployment(
		deployment: IncompleteDeployment
	): Promise<void> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(
				[INCOMPLETE_STORE],
				"readwrite"
			);
			const store = transaction.objectStore(INCOMPLETE_STORE);
			const request = store.put(deployment);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async getIncompleteDeploymentsByOwner(
		ownerAddress: string
	): Promise<IncompleteDeployment[]> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(
				[INCOMPLETE_STORE],
				"readonly"
			);
			const store = transaction.objectStore(INCOMPLETE_STORE);
			const index = store.index("deployedBy");
			const request = index.getAll(ownerAddress);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result || []);
		});
	}

	async deleteIncompleteDeployment(deploymentId: string): Promise<void> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(
				[INCOMPLETE_STORE],
				"readwrite"
			);
			const store = transaction.objectStore(INCOMPLETE_STORE);
			const request = store.delete(deploymentId);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}
}

export const dbManager = new IndexedDBManager();
