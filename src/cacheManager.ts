import { Worker, isMainThread, parentPort } from "worker_threads";
import path from "path";

type EvictionStrategy = "LRU" | "time-based" | "hybrid" | string;
type MemoryMode = "low-ram" | "high-performance" | "balanced" | "extreme-performance" | string;
type CleanupFrequency = "adaptive" | "manual" | "scheduled" | "on-demand" | string;

interface CacheOptions {
  maxSize?: number;
  evictionStrategy?: EvictionStrategy;
  memoryMode?: MemoryMode;
  cleanupFrequency?: CleanupFrequency;
  useWorkerThreads?: boolean;
  ttl?: number;
}

class Node<T> {
  key: string;
  value: T;
  size: number;
  prev: Node<T> | null = null;
  next: Node<T> | null = null;
  timestamp: number;

  constructor(key: string, value: T, size: number) {
    this.key = key;
    this.value = value;
    this.size = size;
    this.timestamp = Date.now();
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
  private ttl?: number;
  private writeQueue: { key: string; value: T }[] = [];
  private isWriting: boolean = false;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 20 * 1024 * 1024;
    this.evictionStrategy = options.evictionStrategy ?? "LRU";
    this.memoryMode = options.memoryMode ?? "high-performance";
    this.cleanupFrequency = options.cleanupFrequency ?? "adaptive";
    this.workerEnabled = options.useWorkerThreads ?? false;
    this.ttl = options.ttl;

    if (this.workerEnabled && isMainThread) {
      this.worker = new Worker(path.join(__dirname, "cacheWorker.js"));
    }

    if (this.cleanupFrequency === "scheduled") {
      setInterval(() => this.lazyCleanup(), 300000); // Every 5 minutes
    }
  }

  // 🚀 Fast Writes with Batch Processing
  async setCache(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      this.writeQueue.push({ key, value });

      if (!this.isWriting) {
        this.isWriting = true;
        setImmediate(async () => {
          await this.processWriteQueue();
          this.isWriting = false;
          resolve();
        });
      }
    });
  }

  private async processWriteQueue(): Promise<void> {
    while (this.writeQueue.length > 0) {
      const { key, value } = this.writeQueue.shift()!;
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
    }
  }

  async getCache(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      setImmediate(() => {
        if (!this.cache.has(key)) return resolve(null);

        const node = this.cache.get(key)!;

        if (this.ttl && Date.now() - node.timestamp > this.ttl) {
          this.deleteCache(key);
          return resolve(null);
        }

        this.moveToFront(node);
        resolve(node.value);
      });
    });
  }

  async deleteCache(key: string): Promise<boolean> {
    return new Promise((resolve) => {
      setImmediate(() => {
        if (!this.cache.has(key)) return resolve(false);

        const node = this.cache.get(key)!;
        this.removeNode(node);
        this.cache.delete(key);
        this.currentSize -= node.size;

        resolve(true);
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

  private async lazyCleanup(): Promise<void> {
    return new Promise((resolve) => {
      setImmediate(() => {
        while (this.currentSize > this.maxSize && this.tail) {
          const removedNode = this.tail;
          this.removeNode(removedNode);
          this.cache.delete(removedNode.key);
          this.currentSize -= removedNode.size;
        }
        resolve();
      });
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

// 🌟 Worker Thread Execution (Runs in a Separate File)
if (!isMainThread) {
  parentPort?.on("message", (task) => {
    if (task.action === "set") {
      // Simulate async cache operation
      setTimeout(() => parentPort?.postMessage({ success: true }), 10);
    }
  });
}

export default CacheManager;
