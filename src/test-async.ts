import { createDB } from "./index";

async function runTests() {
  console.log("=== LightDB Tests ===");

  const db = createDB("./data", "test");

  // Basic set/get
  await db.set("user", { name: "Alice", age: 25 });
  console.log("User:", await db.get("user"));

  // Update
  await db.update("user.age", (age: number) => age + 1);
  console.log("Updated Age:", await db.get("user.age"));

  // Toggle boolean
  await db.set("user.active", false);
  await db.toggle("user.active");
  console.log("Toggled Active:", await db.get("user.active"));

  // Math ops
  await db.set("score", 10);
  await db.plus("score", 5);
  await db.divide("score", 2);
  console.log("Final Score:", await db.get("score"));

  // Array ops
  await db.set("items", [1, 2, 2, 3]);
  await db.append("items", [4, 5]);
  await db.unique("items");
  await db.sort("items");
  console.log("Items:", await db.get("items"));
  console.log("Find >3:", await db.find("items", (x: number) => x > 3));
  console.log("Filter even:", await db.filter("items", (x: number) => x % 2 === 0));
  console.log("Slice [1,3):", await db.slice("items", 1, 3));

  // Cache info
  console.log("Cache Info:", db.getCacheInfo());

  // Disable cache
  db.disableCache();
  console.log("After disableCache:", db.getCacheInfo());

  // Re-enable cache with default limit
  await db.enableCache();
  console.log("After enableCache (default):", db.getCacheInfo());

  // Re-enable cache with custom limit (5MB)
  await db.enableCache(5 * 1024 * 1024);
  console.log("After enableCache (5MB):", db.getCacheInfo());

  // Save immediately
  await db.saveNow();
  console.log("DB flushed with saveNow()");
}

runTests().catch(err => console.error("Test failed:", err));
