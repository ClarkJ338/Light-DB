import Storage from "./storage";

interface DBOptions {
  /** Maximum cache size in bytes (default: 2MB). */
  cacheLimit?: number;
}

export function createDB(dir: string, dbName: string, options: DBOptions = {}) {
  const cacheLimit = options.cacheLimit ?? 2 * 1024 * 1024; // 2MB default
  return new Storage(dir, dbName, cacheLimit);
}
export default createDB;

export type { DBOptions };
