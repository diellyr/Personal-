import { DataProvider } from './dataProvider.js';
import { dbPut, dbGet, dbDelete, dbGetAll, dbGetAllByIndex, dbClearStore, dbCount } from './db.js';

export class IndexedDbProvider extends DataProvider {
  async put(storeName, value) {
    return dbPut(storeName, value);
  }
  async get(storeName, id) {
    return dbGet(storeName, id);
  }
  async delete(storeName, id) {
    return dbDelete(storeName, id);
  }
  async getAll(storeName) {
    return dbGetAll(storeName);
  }
  async getAllByIndex(storeName, indexName, value) {
    return dbGetAllByIndex(storeName, indexName, value);
  }
  async clearStore(storeName) {
    return dbClearStore(storeName);
  }
  async count(storeName) {
    return dbCount(storeName);
  }
}

export const dataProvider = new IndexedDbProvider();
