import * as fs from "fs/promises";
import * as path from "path";

class Storage {
  private dbName: string;
  private dir: string;
  private file: string;
  private cache: Record<string, any> | null = null;

  constructor(dirPath: string, dbName: string) {
    this.dbName = dbName;
    this.dir = path.resolve(dirPath);
    this.file = path.join(this.dir, `${dbName}.json`);
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
    this.cache = await this.readFile();
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
    if (this.cache) {
      await fs.writeFile(this.file, JSON.stringify(this.cache, null, 2), "utf-8");
    }
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
    if (!this.cache) await this.refreshCache();
    return this.deepGet(this.cache!, key, defaultValue);
  }

  async has(key: string): Promise<boolean> {
    if (!this.cache) await this.refreshCache();
    return this.deepGet(this.cache!, key, undefined) !== undefined;
  }

  async set(
    key: string,
    value: any,
    options: { merge?: boolean; append?: boolean; operation?: string } = {}
  ) {
    if (!this.cache) await this.refreshCache();
    const existingValue = this.deepGet(this.cache!, key, undefined);

    if (typeof existingValue === "number" && options.operation) {
      switch (options.operation) {
        case "+": this.deepSet(this.cache!, key, existingValue + value); break;
        case "-": this.deepSet(this.cache!, key, existingValue - value); break;
        case "*": this.deepSet(this.cache!, key, existingValue * value); break;
        case "/": if (value === 0) throw new Error("Division by zero"); this.deepSet(this.cache!, key, existingValue / value); break;
        case "%": if (value === 0) throw new Error("Modulo by zero"); this.deepSet(this.cache!, key, existingValue % value); break;
        case "**": this.deepSet(this.cache!, key, existingValue ** value); break;
        default: throw new Error(`Invalid operation "${options.operation}"`);
      }
    } else if (options.append && Array.isArray(existingValue) && Array.isArray(value)) {
      this.deepSet(this.cache!, key, [...existingValue, ...value]);
    } else if (options.merge && typeof existingValue === "object" && typeof value === "object") {
      this.deepSet(this.cache!, key, { ...existingValue, ...value });
    } else {
      this.deepSet(this.cache!, key, value);
    }

    await this.writeFile();
  }

  async update(key: string, updater: (value: any) => any): Promise<boolean> {
    if (!this.cache) await this.refreshCache();
    const existingValue = this.deepGet(this.cache!, key, undefined);
    if (existingValue === undefined) return false;
    this.deepSet(this.cache!, key, updater(existingValue));
    await this.writeFile();
    return true;
  }

  async toggle(key: string) {
    if (!this.cache) await this.refreshCache();
    const currentValue = this.deepGet(this.cache!, key, undefined);
    if (typeof currentValue !== "boolean") {
      throw new Error("Toggle only works on boolean values.");
    }
    this.deepSet(this.cache!, key, !currentValue);
    await this.writeFile();
  }

  async delete(key: string): Promise<boolean> {
    if (!this.cache) await this.refreshCache();
    const keys = key.split(".");
    let obj: any = this.cache!;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in obj)) return false;
      obj = obj[keys[i]];
    }
    if (!(keys[keys.length - 1] in obj)) return false;
    delete obj[keys[keys.length - 1]];
    await this.writeFile();
    return true;
  }

  async keys(): Promise<string[]> {
    if (!this.cache) await this.refreshCache();
    return Object.keys(this.cache!);
  }

  async values(): Promise<any[]> {
    if (!this.cache) await this.refreshCache();
    return Object.values(this.cache!);
  }

  async merge(key: string, newData: object) {
    if (!this.cache) await this.refreshCache();
    const existingValue = this.deepGet(this.cache!, key, {});
    if (typeof existingValue !== "object") {
      throw new Error("Merge target must be an object.");
    }
    this.deepSet(this.cache!, key, { ...existingValue, ...newData });
    await this.writeFile();
  }
  
  async plus(key: string, amount: number = 1) {
    if (!this.cache) await this.refreshCache();
    let existingValue = this.deepGet(this.cache!, key, 0);

    if (typeof existingValue !== "number") {
        throw new Error(`Cannot perform addition on non-numeric value at key "${key}".`);
    }

    this.deepSet(this.cache!, key, existingValue + amount);
    await this.writeFile();
}

async minus(key: string, amount: number = 1) {
    await this.plus(key, -amount);
}

async multiple(key: string, factor: number = 1) {
    if (!this.cache) await this.refreshCache();
    let existingValue = this.deepGet(this.cache!, key, 1);

    if (typeof existingValue !== "number") {
        throw new Error(`Cannot perform multiplication on non-numeric value at key "${key}".`);
    }

    this.deepSet(this.cache!, key, existingValue * factor);
    await this.writeFile();
}

async divide(key: string, divisor: number = 1) {
    if (!this.cache) await this.refreshCache();
    let existingValue = this.deepGet(this.cache!, key, 1);

    if (typeof existingValue !== "number") {
        throw new Error(`Cannot perform division on non-numeric value at key "${key}".`);
    }

    if (divisor === 0) {
        throw new Error("Division by zero is not allowed.");
    }

    this.deepSet(this.cache!, key, existingValue / divisor);
    await this.writeFile();
}
}

export default Storage;
