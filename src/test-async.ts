import assert from "assert";
import { createDB } from "./index";

async function runTests() {
  console.log("=== LightDB Tests ===");

  const db = createDB("./data", "test");

  // 🔄 Reset DB keys
  await db.set("user", { name: "Alice", age: 25, active: false });
  await db.set("score", 10);
  await db.set("items", [1, 2, 2, 3]);

  // Basic get
  const user = await db.get("user");
  console.log("User:", user);
  assert.deepStrictEqual(user, { name: "Alice", age: 25, active: false });

  // Update
  await db.update("user.age", (age: number) => age + 1);
  const updatedAge = await db.get("user.age");
  console.log("Updated Age:", updatedAge);
  assert.strictEqual(updatedAge, 26);

  // Toggle boolean
  await db.toggle("user.active");
  const toggled = await db.get("user.active");
  console.log("Toggled Active:", toggled);
  assert.strictEqual(toggled, true);

  // Math ops
  await db.plus("score", 5);
  await db.divide("score", 2);
  const finalScore = await db.get("score");
  console.log("Final Score:", finalScore);
  assert.strictEqual(finalScore, 7.5);

  // Array ops
  await db.append("items", [4, 5]);
  await db.unique("items");
  await db.sort("items");
  const items = await db.get("items");
  console.log("Items:", items);
  assert.deepStrictEqual(items, [1, 2, 3, 4, 5]);

  const found = await db.find("items", (x: number) => x > 3);
  console.log("Find >3:", found);
  assert.strictEqual(found, 4);

  const filtered = await db.filter("items", (x: number) => x % 2 === 0);
  console.log("Filter even:", filtered);
  assert.deepStrictEqual(filtered, [2, 4]);

  const sliced = await db.slice("items", 1, 3);
  console.log("Slice [1,3):", sliced);
  assert.deepStrictEqual(sliced, [2, 3]);

  // Cache info
  console.log("Cache Info:", db.getCacheInfo());
  assert.strictEqual(typeof db.getCacheInfo().enabled, "boolean");

  // Disable cache
  db.disableCache();
  console.log("After disableCache:", db.getCacheInfo());
  assert.strictEqual(db.getCacheInfo().enabled, false);

  // Re-enable cache (default)
  await db.enableCache();
  console.log("After enableCache (default):", db.getCacheInfo());
  assert.strictEqual(db.getCacheInfo().enabled, true);

  // Re-enable cache with custom limit (5MB)
  await db.enableCache(5 * 1024 * 1024);
  console.log("After enableCache (5MB):", db.getCacheInfo());
  assert.strictEqual(db.getCacheInfo().maxSize, 5 * 1024 * 1024);

  // Save immediately
  await db.saveNow();
  console.log("DB flushed with saveNow()");

  console.log("✅ All tests passed!");
}

runTests().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
