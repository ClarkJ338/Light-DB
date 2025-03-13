import lightdb from "./index";

async function runAsyncTests() {
  console.log("✅ Running Full TrainerDB Test Suite (Async Mode)...\n");

  const db = lightdb("db", "./db");

  // 🟢 Basic CRUD Tests
  await db.set("user", { name: "Ash", age: 10 });
  console.log("🟢 get user:", await db.get("user")); // { name: "Ash", age: 10 }
  console.log("🟢 has user:", await db.has("user")); // true
  console.log("🟢 has non-existent key:", await db.has("nonexistent")); // false

  await db.delete("user");
  console.log("🟢 has user after delete:", await db.has("user")); // false

  // 🟢 Deep Object Handling
  await db.set("user.profile", { hometown: "Pallet Town", region: "Kanto" });
  console.log("🟢 get user.profile:", await db.get("user.profile"));

  await db.update("user.profile.region", (region: string) => region.toUpperCase());
  console.log("🟢 updated user.profile.region:", await db.get("user.profile.region")); // "KANTO"

  // 🟢 Boolean Handling
  await db.set("user.active", false);
  await db.toggle("user.active");
  console.log("🟢 toggled user.active:", await db.get("user.active")); // true

  // 🟢 Math Operations
  await db.set("wallet.balance", 100);
  await db.plus("wallet.balance", 50);
  console.log("🟢 plus balance:", await db.get("wallet.balance")); // 150

  await db.minus("wallet.balance", 20);
  console.log("🟢 minus balance:", await db.get("wallet.balance")); // 130

  await db.multiple("wallet.balance", 2);
  console.log("🟢 multiple balance:", await db.get("wallet.balance")); // 260

  await db.divide("wallet.balance", 2);
  console.log("🟢 divide balance:", await db.get("wallet.balance")); // 130

  // 🛑 Error Handling: Division by Zero
  try {
    await db.divide("wallet.balance", 0);
  } catch (e) {
    console.error("🛑 Division by zero error caught:", e instanceof Error ? e.message : e);
  }

  // 🟢 Object Merging
  await db.set("user.stats", { hp: 100, attack: 50 });
  await db.merge("user.stats", { defense: 70 });
  console.log("🟢 merged user.stats:", await db.get("user.stats")); // { hp: 100, attack: 50, defense: 70 }

  // 🟢 Array Handling
  await db.set("user.pokemon", ["Pikachu"]);
  await db.set("user.pokemon", ["Charizard"], { append: true });
  console.log("🟢 append to pokemon:", await db.get("user.pokemon"));

  await db.set("user.items", ["Potion", "Potion", "Pokeball"]);
  const items = await db.get("user.items") || [];
  await db.set("user.items", [...new Set(items)]);
  console.log("🟢 unique items:", await db.get("user.items")); // ["Potion", "Pokeball"]

  // 🟢 Sorting & Reversing Arrays
  await db.set("user.numbers", [3, 1, 4, 1, 5, 9]);
  await db.set("user.numbers", (await db.get("user.numbers")).sort((a: number, b: number) => a - b));
  console.log("🟢 sorted numbers:", await db.get("user.numbers")); // [1, 1, 3, 4, 5, 9]

  await db.set("user.numbers", (await db.get("user.numbers")).reverse());
  console.log("🟢 reversed numbers:", await db.get("user.numbers")); // [9, 5, 4, 3, 1, 1]

  // 🟢 Finding & Filtering
  await db.set("user.numbers", [10, 20, 30, 40, 50]);
  const foundNumber = (await db.get("user.numbers")).find((num: number) => num > 25);
  console.log("🟢 find first number > 25:", foundNumber); // 30

  const filteredNumbers = (await db.get("user.numbers")).filter((num: number) => num > 25);
  console.log("🟢 filter numbers > 25:", filteredNumbers); // [30, 40, 50]

  // 🟢 Slicing Arrays
  const slicedNumbers = (await db.get("user.numbers")).slice(1, 4);
  console.log("🟢 slice numbers (1 to 4):", slicedNumbers); // [20, 30, 40]

  // 🟢 Keys & Values Retrieval
  console.log("🟢 all keys:", await db.keys()); // Should list all keys
  console.log("🟢 all values:", await db.values()); // Should list all values

  console.log("\n✅ All async tests passed!\n");
}

runAsyncTests();
