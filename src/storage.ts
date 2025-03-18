import * as fs from "fs/promises";
import * as path from "path";
import CacheManager, { CacheOptions } from "./cacheManager";

class Storage {
  private dbName: string;
  private dir: string;
  private file: string;
  private cacheManager: CacheManager;

  constructor(dirPath: string, dbName: string, cacheOptions?: CacheOptions) {
    this.dbName = dbName;
    this.dir = path.resolve(dirPath);
    this.file = path.join(this.dir, `${dbName}.json`);
    this.cacheManager = new CacheManager(cacheOptions ?? {});
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

  private async readFile(): Promise<Record<string, any>> {
    const cachedData = await this.cacheManager.getCache(this.file);
    if (cachedData) return cachedData;

    try {
      const data = await fs.readFile(this.file, "utf-8");
      const parsedData = JSON.parse(data);
      await this.cacheManager.setCache(this.file, parsedData);
      return parsedData;
    } catch {
      return {};
    }
  }

  private async writeFile(data: Record<string, any>) {
    await this.cacheManager.setCache(this.file, data);
    await fs.writeFile(this.file, JSON.stringify(data, null, 2), "utf-8");
  }

  async get(key: string, defaultValue: any = null): Promise<any> {
    const data = await this.readFile();
    return data[key] ?? defaultValue;
  }

  async set(key: string, value: any): Promise<void> {
    const data = await this.readFile();
    data[key] = value;
    await this.writeFile(data);
  }

  async delete(key: string): Promise<void> {
    const data = await this.readFile();
    delete data[key];
    await this.writeFile(data);
  }

  async clear(): Promise<void> {
    await this.cacheManager.clearCache();
    await this.writeFile({});
  }

  async keys(): Promise<string[]> {
    const data = await this.readFile();
    return Object.keys(data);
  }

  async values(): Promise<any[]> {
    const data = await this.readFile();
    return Object.values(data);
  }
}

export default Storage;
