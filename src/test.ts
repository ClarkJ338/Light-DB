import CacheManager from "./cacheManager";
import Storage from "./storage";
import * as fs from "fs/promises";
import * as path from "path";

// Test Configuration
const testDir = path.join(__dirname, "test_db");
const testDb = "testDatabase";

// Initialize Storage and Cache with configurations
const cache = new CacheManager({
  maxSize: 50 * 1024 * 1024, // 50MB Cache for testing
  evictionStrategy: "LRU",
  memoryMode: "high-performance",
  cleanupFrequency: "adaptive",
  useWorkerThreads: false, // Change to true to test worker thread support
});

const storage = new Storage(testDir, testDb, {
  cacheOptions: {
    maxSize: 50 * 1024 * 1024,
    evictionStrategy: "LRU",
    memoryMode: "balanced",
    cleanupFrequency: "manual",
  },
});

async function runTests() {
  console.log("Running tests...\n");

  // ---- CacheManager Tests ----
  console.log("Testing CacheManager...");

  await cache.setCacheAsync("key1", "value1");
  console.log("Cache set: ", await cache.getCache("key1"));

  await cache.batchSetAsync([
    { key: "key2", value: 42 },
    { key: "key3", value: { a: 1, b: 2 } },
  ]);
  console.log("Batch set: ", await cache.getCache("key2"), await cache.getCache("key3"));

  console.log("Clearing cache...");
  cache.clearCache();
  console.log("Cache after clear: ", await cache.getCache("key1"));

  // ---- Storage Tests ----
  console.log("\nTesting Storage...");

  await storage.set("user.name", "John Doe");
  console.log("Storage set: ", await storage.get("user.name"));

  await storage.set("numbers", [1, 2, 3], { append: true });
  console.log("Storage append: ", await storage.get("numbers"));

  await storage.update("user.name", (val) => val.toUpperCase());
  console.log("Storage update: ", await storage.get("user.name"));

  await storage.delete("user.name");
  console.log("Storage after delete: ", await storage.get("user.name", "Not Found"));

  // ---- Concurrency Test ----
  console.log("\nTesting concurrent writes...");
  await Promise.all([
    storage.set("concurrent.test1", "A"),
    storage.set("concurrent.test2", "B"),
    storage.set("concurrent.test3", "C"),
  ]);
  console.log("Concurrent writes complete.");
  console.log("Concurrent values:", await storage.get("concurrent.test1"), await storage.get("concurrent.test2"), await storage.get("concurrent.test3"));

  // ---- Performance Test (Large Data) ----
  console.log("\nTesting performance with large data...");

  const largeData = Array.from({ length: 10000 }, (_, i) => ({ id: i, value: `Data ${i}` }));
  await storage.set("largeData", largeData);
  console.log("Large data stored.");
  console.time("Read large data");
  const retrievedData = await storage.get("largeData");
  console.timeEnd("Read large data");

  console.log("Tests completed.");
}

// Run tests
runTests().catch(console.error);
