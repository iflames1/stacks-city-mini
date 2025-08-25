import { DeployedToken } from "@/types";

const DB_NAME = "stx-city-mini";
const DB_VERSION = 1;
const STORE_NAME = "tokens";

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
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					const store = db.createObjectStore(STORE_NAME, {
						keyPath: "id",
					});
					store.createIndex("deployedBy", "deployedBy", {
						unique: false,
					});
					store.createIndex("deployedAt", "deployedAt", {
						unique: false,
					});
				}
			};
		});
	}

	async saveToken(token: DeployedToken): Promise<void> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([STORE_NAME], "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.put(token);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async getTokensByOwner(ownerAddress: string): Promise<DeployedToken[]> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([STORE_NAME], "readonly");
			const store = transaction.objectStore(STORE_NAME);
			const index = store.index("deployedBy");
			const request = index.getAll(ownerAddress);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result || []);
		});
	}

	async getAllTokens(): Promise<DeployedToken[]> {
		if (!this.db) await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([STORE_NAME], "readonly");
			const store = transaction.objectStore(STORE_NAME);
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
			const transaction = this.db!.transaction([STORE_NAME], "readwrite");
			const store = transaction.objectStore(STORE_NAME);
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
			const transaction = this.db!.transaction([STORE_NAME], "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.delete(tokenId);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}
}

export const dbManager = new IndexedDBManager();
