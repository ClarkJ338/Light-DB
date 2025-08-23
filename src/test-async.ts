import lightdb from "./index";

const db = lightdb("./db", "test");

async function runTests() {
  console.log("=== LightDB Tests ===");

  // Basic set/get
  await db.set("user", { name: "Ash", age: 10 });
  console.log("User:", await db.get("user"));

  // Update
  await db.update("user.age", (age) => age + 1);
  console.log("Updated Age:", await db.get("user.age"));

  // Toggle
  await db.set("user.active", false);
  await db.toggle("user.active");
  console.log("Toggled Active:", await db.get("user.active"));

  // Math ops
  await db.set("score", 5);
  await db.plus("score", 10);
  await db.minus("score", 2);
  await db.multiple("score", 3);
  await db.divide("score", 2);
  console.log("Final Score:", await db.get("score"));

  // Arrays
  await db.set("items", [1, 2, 2, 3]);
  await db.append("items", [4, 5]);
  await db.unique("items");
  await db.sort("items");
  console.log("Items:", await db.get("items"));
  console.log("Find >3:", await db.find("items", (x) => x > 3));
  console.log("Filter even:", await db.filter("items", (x) => x % 2 === 0));
  console.log("Slice [1,3):", await db.slice("items", 1, 3));

  // Cache info
  console.log("Cache Info:", db.getCacheInfo());

  // Force save
  await db.saveNow();
  console.log("DB flushed with saveNow()");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
});
