import { Worker, isMainThread, parentPort } from "worker_threads";

type EvictionStrategy = "LRU" | "time-based" | "hybrid" | string;
type MemoryMode = "low-ram" | "high-performance" | "balanced" | "extreme-performance" | string;
type CleanupFrequency = "adaptive" | "manual" | "scheduled" | "on-demand" | string;

interface CacheOptions {
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

  setCache(key: string, value: T) {
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

  async setCacheAsync(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      setImmediate(() => {
        this.setCache(key, value);
        resolve();
      });
    });
  }

  batchSet(entries: { key: string; value: T }[]) {
    entries.forEach(({ key, value }) => this.setCache(key, value));
  }

  async batchSetAsync(entries: { key: string; value: T }[]) {
    return new Promise<void>((resolve) => {
      setImmediate(() => {
        this.batchSet(entries);
        resolve();
      });
    });
  }

  getCache(key: string): T | null {
    if (!this.cache.has(key)) return null;

    const node = this.cache.get(key)!;
    this.moveToFront(node);
    return node.value;
  }

  clearCache() {
    this.cache.clear();
    this.head = this.tail = null;
    this.currentSize = 0;
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

// Worker thread execution
if (!isMainThread) {
  parentPort?.on("message", (task) => {
    if (task.action === "set") {
      // Simulate async cache operation
      setTimeout(() => parentPort?.postMessage({ success: true }), 10);
    }
  });
}

export default CacheManager;
