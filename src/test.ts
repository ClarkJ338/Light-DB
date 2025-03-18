import Storage from "./storage";
import CacheManager from "./cacheManager";

async function testSmallScale() {
  console.log("\n===== SMALL SCALE TEST =====");

  const storage = new Storage("./testdb", "small", { maxSize: 1024 * 1024 });
  await storage.set("user.name", "Alice");
  await storage.set("user.age", 25);

  console.log("Get User Name:", await storage.get("user.name"));
  console.log("Get User Age:", await storage.get("user.age"));
  
  await storage.delete("user.age");
  console.log("User Age Exists After Delete:", await storage.has("user.age"));

  console.log("All Keys:", await storage.keys());
  console.log("All Values:", await storage.values());
}

async function testMediumScale() {
  console.log("\n===== MEDIUM SCALE TEST =====");

  const storage = new Storage("./testdb", "medium", {
    maxSize: 5 * 1024 * 1024, 
    evictionStrategy: "time-based",
    cleanupFrequency: "manual",
  });

  // Writing multiple key-value pairs
  const data = { name: "Bob", age: 30, email: "bob@example.com" };
  await storage.set("profile", data);

  // Fetch & Merge
  console.log("User Profile Before Merge:", await storage.get("profile"));
  await storage.merge("profile", { location: "New York" });
  console.log("User Profile After Merge:", await storage.get("profile"));

  // Numeric Operations
  await storage.plus("profile.age", 5);
  console.log("Updated Age (+5):", await storage.get("profile.age"));

  await storage.minus("profile.age", 10);
  console.log("Updated Age (-10):", await storage.get("profile.age"));

  await storage.multiple("profile.age", 2);
  console.log("Updated Age (*2):", await storage.get("profile.age"));

  await storage.divide("profile.age", 2);
  console.log("Updated Age (/2):", await storage.get("profile.age"));
}

async function testLargeScale() {
  console.log("\n===== LARGE SCALE TEST =====");

  const storage = new Storage("./testdb", "large", {
    maxSize: 50 * 1024 * 1024, 
    evictionStrategy: "LRU",
    memoryMode: "high-performance",
    cleanupFrequency: "adaptive",
    useWorkerThreads: true, 
  });

  const NUM_OPERATIONS = 50000;
  console.time("Large-Scale Write");

  // Insert a large number of key-value pairs
  for (let i = 0; i < NUM_OPERATIONS; i++) {
    await storage.set(`data.${i}`, { value: `Item ${i}`, timestamp: Date.now() });
  }
  console.timeEnd("Large-Scale Write");

  console.time("Large-Scale Read");
  for (let i = 0; i < 1000; i++) {
    await storage.get(`data.${i}`);
  }
  console.timeEnd("Large-Scale Read");

  console.time("Batch Set");
  await storage.set("bulk", Array.from({ length: 1000 }, (_, i) => `Item ${i}`));
  console.timeEnd("Batch Set");

  console.log("Testing Worker Thread Performance...");
  console.time("Worker Threads");
  const cache = new CacheManager({ useWorkerThreads: true });
  await cache.setCacheAsync("testKey", { message: "Hello from worker!" });
  console.timeEnd("Worker Threads");
  
  console.log("Worker Test Read:", await cache.getCache("testKey"));
}

// Run all tests sequentially
(async () => {
  await testSmallScale();
  await testMediumScale();
  await testLargeScale();
})();
