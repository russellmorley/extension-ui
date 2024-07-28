import { IPersist } from "src/types/persist.type";

type Value = {storeKey: string, items: any[]};

export class IndexedDbPersist implements IPersist {
  db: IDBDatabase | undefined;
  objectStore: string;

  constructor(objectStore: string) {
    this.objectStore = objectStore;
  }

  openDb(dbName: string, dbVersion: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const openRequest = indexedDB.open(dbName, dbVersion);
      const instance = this;

      openRequest.onerror = (event) => {
        console.error(`Couldn't open db ${dbName} version ${dbVersion} due to error ${event.target.errorCode}`);
      };
      openRequest.onsuccess = (e) => {
        console.debug(`onsuccess: setting db ${e.target.result}`);
        instance.db = e.target.result;
        resolve();
      };

      openRequest.onupgradeneeded = function(e) {
        const db = e.target.result;
        console.debug(`onupgradeneeded: getting db ${e.target.result}`);
        if (!db.objectStoreNames.contains(instance.objectStore)) {
          db.createObjectStore(instance.objectStore, { keyPath: 'storeKey' });
          console.debug(`created object store ${instance.objectStore}`);
        }
      };
    });
  }

  get(key: string) : Promise<any[] | undefined> {
    return new Promise<any[] | undefined>((resolve, reject) => {
      try {
        const itemsNotAdded: Array<string> = new Array<string>();

        if (typeof this.db === 'undefined') {
          reject(`get ${key}: db not set`);
        }
        const request = this.db!
          .transaction([this.objectStore])
          .objectStore(this.objectStore)
          .get(key);
        request.onsuccess = (event) => {
          resolve((request.result as Value)?.items ?? undefined);
        };
        request.onerror = (error) => {
          reject(JSON.stringify(error));
        };
      } catch (e) {
        reject(JSON.stringify(e));
      }
    });
  }

  set(key: string, items: any[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        if (typeof this.db === 'undefined') {
          reject('set ${key}: db not set');
        }
        const transaction = this.db!.transaction([this.objectStore], "readwrite");
        transaction.oncomplete = (event) => {
          resolve();
        };
        transaction.onerror = (event) => {
          reject(`Couldn\'t create transaction: ${JSON.stringify(event)}`);
        };

        const store = transaction.objectStore(this.objectStore);

        let request: IDBRequest<IDBValidKey>;
        try {
          const request = store.add({storeKey: key, items} as Value);
          request.onerror = (event) => {
            reject(`Couldn\'t add: ${JSON.stringify(event)}`);
          };
        } catch (ConstraintError) {
          const request = store.put({storeKey: key, items} as Value)
          request.onerror = (event) => {
            reject(`Couldn\'t put: ${JSON.stringify(event)}`);
          };
        }
      } catch (e) {
        reject(JSON.stringify(e));
      }
    });
  }

  remove(key: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        if (typeof this.db === 'undefined') {
          reject('remove ${key}: db not set');
        }
        const request = this.db!
          .transaction([this.objectStore], "readwrite")
          .objectStore(this.objectStore)
          .delete(key);
        request.onsuccess = (event) => {
          resolve();
        }
        request.onerror = (error) => {
          reject(JSON.stringify(error));
        }

      } catch (e) {
        reject(JSON.stringify(e));
      }
   });
  }
}
