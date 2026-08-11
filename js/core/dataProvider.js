/**
 * DataProvider is the seam between Repositories and physical storage.
 * Today only IndexedDbProvider implements it. A future SupabaseProvider
 * implements the exact same interface so Repositories (and every module
 * built on top of them) never change when storage migrates.
 *
 * Interface (all async):
 *   put(storeName, value) -> value
 *   get(storeName, id) -> value|null
 *   delete(storeName, id) -> boolean
 *   getAll(storeName) -> value[]
 *   getAllByIndex(storeName, indexName, value) -> value[]
 *   clearStore(storeName) -> boolean
 *   count(storeName) -> number
 */
export class DataProvider {
  async put() { throw new Error('not implemented'); }
  async get() { throw new Error('not implemented'); }
  async delete() { throw new Error('not implemented'); }
  async getAll() { throw new Error('not implemented'); }
  async getAllByIndex() { throw new Error('not implemented'); }
  async clearStore() { throw new Error('not implemented'); }
  async count() { throw new Error('not implemented'); }
}
