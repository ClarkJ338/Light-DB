import * as fs from "fs/promises";
import * as path from "path";

interface StorageOptions {
  pretty?: boolean;
  backup?: boolean;
  lockTimeout?: number;
}

interface SetOptions {
  merge?: boolean;
  append?: boolean;
  operation?: string;
}

class Storage {
  private dbName: string;
  private dir: string;
  private file: string;
  private lockFile: string;
  private backupFile: string;
  private options: StorageOptions;
  private operationQueue: Promise<any> = Promise.resolve();

  constructor(dirPath: string, dbName: string, options: StorageOptions = {}) {
    this.dbName = dbName;
    this.dir = path.resolve(dirPath);
    this.file = path.join(this.dir, `${dbName}.json`);
    this.lockFile = path.join(this.dir, `${dbName}.lock`);
    this.backupFile = path.join(this.dir, `${dbName}.backup.json`);
    this.options = {
      pretty: true,
      backup: false,
      lockTimeout: 5000,
      ...options
    };
    this.init();
  }

  private async init() {
    try {
      await fs.mkdir(this.dir, { recursive: true });
      await fs.access(this.file);
    } catch {
      await fs.writeFile(this.file, "{}", "utf-8");
    }
  }

  private async acquireLock(): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.options.lockTimeout!) {
      try {
        await fs.writeFile(this.lockFile, process.pid.toString(), { flag: 'wx' });
        return;
      } catch (error: any) {
        if (error.code !== 'EEXIST') throw error;
        await this.sleep(10);
      }
    }
    
    throw new Error('Failed to acquire file lock within timeout');
  }

  private async releaseLock(): Promise<void> {
    try {
      await fs.unlink(this.lockFile);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    return this.operationQueue = this.operationQueue.then(async () => {
      await this.acquireLock();
      try {
        return await operation();
      } finally {
        await this.releaseLock();
      }
    });
  }

  private async readFile(): Promise<Record<string, any>> {
    try {
      const data = await fs.readFile(this.file, "utf-8");
      const parsed = JSON.parse(data);
      
      // Validate that it's an object
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Invalid JSON structure: expected object');
      }
      
      return parsed;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return {};
      }
      
      // Try to recover from backup if available
      if (this.options.backup) {
        try {
          const backupData = await fs.readFile(this.backupFile, "utf-8");
          console.warn('Recovered from backup file due to corrupted main file');
          return JSON.parse(backupData);
        } catch {
          // Backup also failed, return empty object
        }
      }
      
      console.warn('Failed to read database file, returning empty object');
      return {};
    }
  }

  private async writeFile(data: Record<string, any>): Promise<void> {
    // Create backup if enabled
    if (this.options.backup) {
      try {
        const currentData = await fs.readFile(this.file, "utf-8");
        await fs.writeFile(this.backupFile, currentData, "utf-8");
      } catch {
        // Ignore backup creation errors
      }
    }

    const jsonString = this.options.pretty 
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
    
    // Write to temporary file first, then rename (atomic operation)
    const tempFile = `${this.file}.tmp`;
    await fs.writeFile(tempFile, jsonString, "utf-8");
    await fs.rename(tempFile, this.file);
  }

  private deepGet(obj: Record<string, any>, keyPath: string, defaultValue: any = null) {
    if (!keyPath) return obj;
    
    const keys = keyPath.split(".");
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
      if (current === undefined) {
        return defaultValue;
      }
    }
    
    return current;
  }

  private deepSet(obj: Record<string, any>, keyPath: string, value: any): void {
    if (!keyPath) throw new Error('Key path cannot be empty');
    
    const keys = keyPath.split(".");
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== "object" || Array.isArray(current[key])) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private deepDelete(obj: Record<string, any>, keyPath: string): boolean {
    if (!keyPath) return false;
    
    const keys = keyPath.split(".");
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== "object") {
        return false;
      }
      current = current[key];
    }
    
    const lastKey = keys[keys.length - 1];
    if (!(lastKey in current)) {
      return false;
    }
    
    delete current[lastKey];
    return true;
  }

  async get<T = any>(key: string, defaultValue: T | null = null): Promise<T | null> {
    return this.withLock(async () => {
      const data = await this.readFile();
      return this.deepGet(data, key, defaultValue);
    });
  }

  async has(key: string): Promise<boolean> {
    return this.withLock(async () => {
      const data = await this.readFile();
      return this.deepGet(data, key, Symbol('not-found')) !== Symbol('not-found');
    });
  }

  async set(key: string, value: any, options: SetOptions = {}): Promise<void> {
    return this.withLock(async () => {
      const data = await this.readFile();
      const existingValue = this.deepGet(data, key, undefined);

      if (typeof existingValue === "number" && options.operation) {
        const result = this.performMathOperation(existingValue, value, options.operation);
        this.deepSet(data, key, result);
      } else if (options.append && Array.isArray(existingValue) && Array.isArray(value)) {
        this.deepSet(data, key, [...existingValue, ...value]);
      } else if (options.merge && this.isPlainObject(existingValue) && this.isPlainObject(value)) {
        this.deepSet(data, key, { ...existingValue, ...value });
      } else {
        this.deepSet(data, key, value);
      }

      await this.writeFile(data);
    });
  }

  private performMathOperation(existing: number, value: number, operation: string): number {
    switch (operation) {
      case "+": return existing + value;
      case "-": return existing - value;
      case "*": return existing * value;
      case "/": 
        if (value === 0) throw new Error("Division by zero");
        return existing / value;
      case "%": 
        if (value === 0) throw new Error("Modulo by zero");
        return existing % value;
      case "**": return existing ** value;
      case "min": return Math.min(existing, value);
      case "max": return Math.max(existing, value);
      default: throw new Error(`Invalid operation "${operation}"`);
    }
  }

  private isPlainObject(value: any): boolean {
    return value !== null && 
           typeof value === 'object' && 
           !Array.isArray(value) && 
           Object.prototype.toString.call(value) === '[object Object]';
  }

  async update<T>(key: string, updater: (value: T) => T): Promise<boolean> {
    return this.withLock(async () => {
      const data = await this.readFile();
      const existingValue = this.deepGet(data, key, undefined);
      
      if (existingValue === undefined) {
        return false;
      }
      
      const newValue = updater(existingValue);
      this.deepSet(data, key, newValue);
      await this.writeFile(data);
      return true;
    });
  }

  async toggle(key: string): Promise<void> {
    return this.withLock(async () => {
      const data = await this.readFile();
      const currentValue = this.deepGet(data, key, undefined);
      
      if (typeof currentValue !== "boolean") {
        throw new Error("Toggle only works on boolean values.");
      }
      
      this.deepSet(data, key, !currentValue);
      await this.writeFile(data);
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.withLock(async () => {
      const data = await this.readFile();
      const deleted = this.deepDelete(data, key);
      
      if (deleted) {
        await this.writeFile(data);
      }
      
      return deleted;
    });
  }

  async clear(): Promise<void> {
    return this.withLock(async () => {
      await this.writeFile({});
    });
  }

  async keys(): Promise<string[]> {
    return this.withLock(async () => {
      const data = await this.readFile();
      return Object.keys(data);
    });
  }

  async values(): Promise<any[]> {
    return this.withLock(async () => {
      const data = await this.readFile();
      return Object.values(data);
    });
  }

  async entries(): Promise<[string, any][]> {
    return this.withLock(async () => {
      const data = await this.readFile();
      return Object.entries(data);
    });
  }

  async size(): Promise<number> {
    return this.withLock(async () => {
      const data = await this.readFile();
      return Object.keys(data).length;
    });
  }

  async merge(key: string, newData: object): Promise<void> {
    return this.withLock(async () => {
      const data = await this.readFile();
      const existingValue = this.deepGet(data, key, {});
      
      if (!this.isPlainObject(existingValue)) {
        throw new Error("Merge target must be an object.");
      }
      
      this.deepSet(data, key, { ...existingValue, ...newData });
      await this.writeFile(data);
    });
  }
  
  async plus(key: string, amount: number = 1): Promise<void> {
    return this.set(key, amount, { operation: '+' });
  }

  async minus(key: string, amount: number = 1): Promise<void> {
    return this.set(key, amount, { operation: '-' });
  }

  async multiply(key: string, factor: number): Promise<void> {
    return this.set(key, factor, { operation: '*' });
  }

  async divide(key: string, divisor: number): Promise<void> {
    return this.set(key, divisor, { operation: '/' });
  }

  async min(key: string, value: number): Promise<void> {
    return this.set(key, value, { operation: 'min' });
  }

  async max(key: string, value: number): Promise<void> {
    return this.set(key, value, { operation: 'max' });
  }

  // Array operations
  async push(key: string, ...items: any[]): Promise<void> {
    return this.withLock(async () => {
      const data = await this.readFile();
      const existingValue = this.deepGet(data, key, []);
      
      if (!Array.isArray(existingValue)) {
        throw new Error("Push only works on arrays.");
      }
      
      this.deepSet(data, key, [...existingValue, ...items]);
      await this.writeFile(data);
    });
  }

  async pop(key: string): Promise<any> {
    return this.withLock(async () => {
      const data = await this.readFile();
      const existingValue = this.deepGet(data, key, []);
      
      if (!Array.isArray(existingValue) || existingValue.length === 0) {
        return undefined;
      }
      
      const newArray = [...existingValue];
      const popped = newArray.pop();
      this.deepSet(data, key, newArray);
      await this.writeFile(data);
      return popped;
    });
  }

  // Utility methods
  async backup(): Promise<void> {
    if (!this.options.backup) {
      throw new Error('Backup is not enabled. Set backup: true in options.');
    }
    
    return this.withLock(async () => {
      const data = await this.readFile();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.dir, `${this.dbName}.backup.${timestamp}.json`);
      await fs.writeFile(backupPath, JSON.stringify(data, null, 2), 'utf-8');
    });
  }

  async getStats(): Promise<{ size: number; fileSize: number; lastModified: Date }> {
    return this.withLock(async () => {
      const data = await this.readFile();
      const stats = await fs.stat(this.file);
      
      return {
        size: Object.keys(data).length,
        fileSize: stats.size,
        lastModified: stats.mtime
      };
    });
  }

  async close(): Promise<void> {
    // Wait for all pending operations to complete
    await this.operationQueue;
    // Clean up any remaining locks
    await this.releaseLock();
  }
}

export default Storage;