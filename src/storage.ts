import * as fs from "fs/promises";
import * as path from "path";

class Storage {
  private dbName: string;
  private dir: string;
  private file: string;
  private cache: Record<string, any> | null = null;
  private batchTimer: NodeJS.Timeout | null = null;
  private isBatching = false;
  private cacheLimit: number;

  constructor(dirPath: string, dbName: string, cacheLimit: number = 2 * 1024 * 1024) {
    this.dbName = dbName;
    this.dir = path.resolve(dirPath);
    this.file = path.join(this.dir, `${dbName}.json`);
    this.cacheLimit = cacheLimit;
    this.init();
  }

  private async init() {
    try {
      await fs.mkdir(this.dir, { recursive: true });
      await fs.access(this.file);
    } catch {
      await fs.writeFile(this.file, "{}", "utf-8");
    }
    await this.refreshCache();
  }

  private async refreshCache() {
    const data = await this.readFile();
    const size = Buffer.byteLength(JSON.stringify(data), "utf-8");
    if (this.cacheLimit > 0 && size <= this.cacheLimit) {
      this.cache = data; // cache in memory
    } else {
      this.cache = null; // too big, use disk mode
    }
  }

  private async readFile(): Promise<Record<string, any>> {
    try {
      const data = await fs.readFile(this.file, "utf-8");
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  private async writeFile() {
    if (this.isBatching) return;
    this.isBatching = true;
    if (this.batchTimer) clearTimeout(this.batchTimer);

    this.batchTimer = setTimeout(async () => {
      const data = this.cache ?? (await this.readFile());
      await fs.writeFile(this.file, JSON.stringify(data, null, 2), "utf-8");
      this.isBatching = false;
    }, 1000);
  }

  /** Immediately flush cache/disk data to disk (skips batching) */
  async saveNow() {
    const data = this.cache ?? (await this.readFile());
    await fs.writeFile(this.file, JSON.stringify(data, null, 2), "utf-8");
  }

  private deepGet(obj: Record<string, any>, path: string, defaultValue: any) {
    return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : defaultValue), obj);
  }

  private deepSet(obj: Record<string, any>, path: string, value: any) {
    const keys = path.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]] || typeof current[keys[i]] !== "object") {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }

  async get(key: string, defaultValue: any = null): Promise<any> {
    if (this.cache) return this.deepGet(this.cache, key, defaultValue);
    const data = await this.readFile();
    return this.deepGet(data, key, defaultValue);
  }

  async has(key: string): Promise<boolean> {
    if (this.cache) return this.deepGet(this.cache, key, undefined) !== undefined;
    const data = await this.readFile();
    return this.deepGet(data, key, undefined) !== undefined;
  }

  async set(
    key: string,
    value: any,
    options: { merge?: boolean; append?: boolean; operation?: string } = {}
  ) {
    const data = this.cache ?? (await this.readFile());
    const existingValue = this.deepGet(data, key, undefined);

    if (typeof existingValue === "number" && options.operation) {
      switch (options.operation) {
        case "+": this.deepSet(data, key, existingValue + value); break;
        case "-": this.deepSet(data, key, existingValue - value); break;
        case "*": this.deepSet(data, key, existingValue * value); break;
        case "/": if (value === 0) throw new Error("Division by zero"); this.deepSet(data, key, existingValue / value); break;
        case "%": if (value === 0) throw new Error("Modulo by zero"); this.deepSet(data, key, existingValue % value); break;
        case "**": this.deepSet(data, key, existingValue ** value); break;
        default: throw new Error(`Invalid operation "${options.operation}"`);
      }
    } else if (options.append && Array.isArray(existingValue) && Array.isArray(value)) {
      this.deepSet(data, key, [...existingValue, ...value]);
    } else if (options.merge && typeof existingValue === "object" && typeof value === "object") {
      this.deepSet(data, key, { ...existingValue, ...value });
    } else {
      this.deepSet(data, key, value);
    }

    if (this.cache) this.cache = data;
    await this.writeFile();
  }

  async update(key: string, updater: (value: any) => any): Promise<boolean> {
    const data = this.cache ?? (await this.readFile());
    const existingValue = this.deepGet(data, key, undefined);
    if (existingValue === undefined) return false;
    this.deepSet(data, key, updater(existingValue));
    if (this.cache) this.cache = data;
    await this.writeFile();
    return true;
  }

  async toggle(key: string) {
    const data = this.cache ?? (await this.readFile());
    const currentValue = this.deepGet(data, key, undefined);
    if (typeof currentValue !== "boolean") {
      throw new Error("Toggle only works on boolean values.");
    }
    this.deepSet(data, key, !currentValue);
    if (this.cache) this.cache = data;
    await this.writeFile();
  }

  async delete(key: string): Promise<boolean> {
    const data = this.cache ?? (await this.readFile());
    const keys = key.split(".");
    let obj: any = data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in obj)) return false;
      obj = obj[keys[i]];
    }
    if (!(keys[keys.length - 1] in obj)) return false;
    delete obj[keys[keys.length - 1]];
    if (this.cache) this.cache = data;
    await this.writeFile();
    return true;
  }

  async keys(): Promise<string[]> {
    if (this.cache) return Object.keys(this.cache);
    const data = await this.readFile();
    return Object.keys(data);
  }

  async values(): Promise<any[]> {
    if (this.cache) return Object.values(this.cache);
    const data = await this.readFile();
    return Object.values(data);
  }

  async merge(key: string, newData: object) {
    const data = this.cache ?? (await this.readFile());
    const existingValue = this.deepGet(data, key, {});
    if (typeof existingValue !== "object") {
      throw new Error("Merge target must be an object.");
    }
    this.deepSet(data, key, { ...existingValue, ...newData });
    if (this.cache) this.cache = data;
    await this.writeFile();
  }

  async plus(key: string, amount: number = 1) {
    const data = this.cache ?? (await this.readFile());
    let existingValue = this.deepGet(data, key, 0);
    if (typeof existingValue !== "number") {
      throw new Error(`Cannot perform addition on non-numeric value at key "${key}".`);
    }
    this.deepSet(data, key, existingValue + amount);
    if (this.cache) this.cache = data;
    await this.writeFile();
  }

  async minus(key: string, amount: number = 1) {
    await this.plus(key, -amount);
  }

  async multiple(key: string, factor: number = 1) {
    const data = this.cache ?? (await this.readFile());
    let existingValue = this.deepGet(data, key, 1);
    if (typeof existingValue !== "number") {
      throw new Error(`Cannot perform multiplication on non-numeric value at key "${key}".`);
    }
    this.deepSet(data, key, existingValue * factor);
    if (this.cache) this.cache = data;
    await this.writeFile();
  }

  async divide(key: string, divisor: number = 1) {
    const data = this.cache ?? (await this.readFile());
    let existingValue = this.deepGet(data, key, 1);
    if (typeof existingValue !== "number") {
      throw new Error(`Cannot perform division on non-numeric value at key "${key}".`);
    }
    if (divisor === 0) throw new Error("Division by zero is not allowed.");
    this.deepSet(data, key, existingValue / divisor);
    if (this.cache) this.cache = data;
    await this.writeFile();
  }

  // --- Array helpers ---
  async append(key: string, array: any[]) {
    const data = this.cache ?? (await this.readFile());
    let existing = this.deepGet(data, key, []);
    if (!Array.isArray(existing)) throw new Error("Target is not an array.");
    existing.push(...array);
    this.deepSet(data, key, existing);
    if (this.cache) this.cache = data;
    await this.writeFile();
  }

  async unique(key: string) {
    const data = this.cache ?? (await this.readFile());
    let existing = this.deepGet(data, key, []);
    if (!Array.isArray(existing)) throw new Error("Target is not an array.");
    this.deepSet(data, key, [...new Set(existing)]);
    if (this.cache) this.cache = data;
    await this.writeFile();
  }

  async sort(key: string, compareFn?: (a: any, b: any) => number) {
    const data = this.cache ?? (await this.readFile());
    let existing = this.deepGet(data, key, []);
    if (!Array.isArray(existing)) throw new Error("Target is not an array.");
    this.deepSet(data, key, existing.sort(compareFn));
    if (this.cache) this.cache = data;
    await this.writeFile();
  }

  async reverse(key: string) {
    const data = this.cache ?? (await this.readFile());
    let existing = this.deepGet(data, key, []);
    if (!Array.isArray(existing)) throw new Error("Target is not an array.");
    this.deepSet(data, key, existing.reverse());
    if (this.cache) this.cache = data;
    await this.writeFile();
  }

  async find(key: string, fn: (item: any) => boolean) {
    const data = this.cache ?? (await this.readFile());
    let existing = this.deepGet(data, key, []);
    if (!Array.isArray(existing)) throw new Error("Target is not an array.");
    return existing.find(fn);
  }

  async filter(key: string, fn: (item: any) => boolean) {
    const data = this.cache ?? (await this.readFile());
    let existing = this.deepGet(data, key, []);
    if (!Array.isArray(existing)) throw new Error("Target is not an array.");
    return existing.filter(fn);
  }

  async slice(key: string, start: number, end?: number) {
    const data = this.cache ?? (await this.readFile());
    let existing = this.deepGet(data, key, []);
    if (!Array.isArray(existing)) throw new Error("Target is not an array.");
    return existing.slice(start, end);
  }
}

export default Storage;                                                       
