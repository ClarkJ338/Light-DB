import { Worker, isMainThread, parentPort } from "worker_threads";

export type EvictionStrategy = "LRU" | "time-based" | "hybrid" | string;
export type MemoryMode = "low-ram" | "high-performance" | "balanced" | "extreme-performance" | string;
export type CleanupFrequency = "adaptive" | "manual" | "scheduled" | "on-demand" | string;

export interface CacheOptions {
  maxSize?: number;
  evictionStrategy?: EvictionStrategy;
  memoryMode?: MemoryMode;
  cleanupFrequency?: CleanupFrequency;
  useWorkerThreads?: boolean;
}

class Node<T> {
  key: string;
  value: T;
  size: number;
  prev: Node<T> | null = null;
  next: Node<T> | null = null;

  constructor(key: string, value: T, size: number) {
    this.key = key;
    this.value = value;
    this.size = size;
  }
}

class CacheManager<T = any> {
  private cache: Map<string, Node<T>> = new Map();
  private head: Node<T> | null = null;
  private tail: Node<T> | null = null;
  private maxSize: number;
  private evictionStrategy: EvictionStrategy;
  private memoryMode: MemoryMode;
  private cleanupFrequency: CleanupFrequency;
  private currentSize: number = 0;
  private workerEnabled: boolean;
  private worker?: Worker;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 20 * 1024 * 1024;
    this.evictionStrategy = options.evictionStrategy ?? "LRU";
    this.memoryMode = options.memoryMode ?? "high-performance";
    this.cleanupFrequency = options.cleanupFrequency ?? "adaptive";
    this.workerEnabled = options.useWorkerThreads ?? false;

    if (this.workerEnabled && isMainThread) {
      this.worker = new Worker(__filename);
    }
  }

  async setCache(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      setImmediate(() => {
        const size = Buffer.byteLength(JSON.stringify(value), "utf-8");
        if (this.cache.has(key)) {
          this.removeNode(this.cache.get(key)!);
        }

        const newNode = new Node(key, value, size);
        this.cache.set(key, newNode);
        this.addToFront(newNode);
        this.currentSize += size;

        if (this.currentSize > this.maxSize) {
          this.lazyCleanup();
        }

        resolve();
      });
    });
  }

  async batchSet(entries: { key: string; value: T }[]): Promise<void> {
    return new Promise((resolve) => {
      setImmediate(() => {
        entries.forEach(({ key, value }) => this.setCache(key, value));
        resolve();
      });
    });
  }

  async getCache(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      setImmediate(() => {
        if (!this.cache.has(key)) resolve(null);
        const node = this.cache.get(key)!;
        this.moveToFront(node);
        resolve(node.value);
      });
    });
  }

  async clearCache(): Promise<void> {
    return new Promise((resolve) => {
      setImmediate(() => {
        this.cache.clear();
        this.head = this.tail = null;
        this.currentSize = 0;
        resolve();
      });
    });
  }

  private lazyCleanup() {
    if (this.cleanupFrequency === "manual") return;

    setImmediate(() => {
      while (this.currentSize > this.maxSize && this.tail) {
        const removedNode = this.tail;
        this.removeNode(removedNode);
        this.cache.delete(removedNode.key);
        this.currentSize -= removedNode.size;
      }
    });
  }

  private addToFront(node: Node<T>) {
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private moveToFront(node: Node<T>) {
    this.removeNode(node);
    this.addToFront(node);
  }

  private removeNode(node: Node<T>) {
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (this.head === node) this.head = node.next;
    if (this.tail === node) this.tail = node.prev;
  }
}

export default CacheManager;
