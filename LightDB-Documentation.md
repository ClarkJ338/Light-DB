# 📖 Light-DB - Full Documentation

This document provides a detailed explanation of every method in Light-DB's Storage class, including real-world scenarios from basic to advanced usage.

## 📦 Table of Contents

1. **Core Methods**
   - [`set()`](#setkey-value)
   - [`get()`](#getkey-defaultvalue)
   - [`has()`](#haskey)
   - [`delete()`](#deletekey)

2. **Math Operations**
   - [`plus()`](#pluskey-amount)
   - [`minus()`](#minuskey-amount)
   - [`multiple()`](#multiplekey-factor)
   - [`divide()`](#dividekey-divisor)

3. **Boolean & Object Operations**
   - [`toggle()`](#togglekey)
   - [`merge()`](#mergekey-object)
   - [`update()`](#updatekey-updaterfunction)

4. **Array Manipulation**
   - [`append()`](#appendkey-array)
   - [`unique()`](#uniquekey)
   - [`sort()`](#sortkey)
   - [`reverse()`](#reversekey)
   - [`find()`](#findkey)
   - [`filter()`](#filterkey)
   - [`slice()`](#slicekey-start-end)

5. **Metadata Methods**
   - [`keys()`](#keys)
   - [`values()`](#values)

---

## 📌 Core Methods

### `set(key, value)`
Stores a value in the database at a specified key.

**Example: Storing user information**
```ts
await db.set("user", { name: "Ash", age: 10, active: true });
```

---

### `get(key, defaultValue?)`
Retrieves data from a key. Returns `defaultValue` if the key is not found.

**Example: Fetching a user's age**
```ts
const age = await db.get("user.age", 18);
```

---

### `has(key)`
Checks if a key exists in the database.

**Example: Checking if a user is registered**
```ts
if (await db.has("user")) {
  console.log("User exists!");
}
```

---

### `delete(key)`
Removes a key from the database.

**Example: Deleting a user account**
```ts
await db.delete("user");
```

---

## 📌 Math Operations

### `plus(key, amount)`
Increments a numeric value.

**Example: Adding money to a wallet**
```ts
await db.plus("wallet.balance", 500);
```

---

### `minus(key, amount)`
Decrements a numeric value.

**Example: Subtracting money after a purchase**
```ts
await db.minus("wallet.balance", 200);
```

---

### `multiple(key, factor)`
Multiplies a numeric value.

**Example: Applying a 2x bonus to experience points**
```ts
await db.multiple("player.xp", 2);
```

---

### `divide(key, divisor)`
Divides a numeric value. Prevents division by zero.

**Example: Splitting points between teammates**
```ts
await db.divide("team.points", 2);
```

---

## 📌 Boolean & Object Operations

### `toggle(key)`
Flips a boolean value (true ⇄ false).

**Example: Activating/deactivating dark mode**
```ts
await db.toggle("settings.darkMode");
```

---

### `merge(key, object)`
Merges an object with an existing object.

**Example: Updating player stats**
```ts
await db.merge("player.stats", { defense: 70 });
```

---

### `update(key, updaterFunction)`
Modifies a value using a function.

**Example: Leveling up a character**
```ts
await db.update("player.level", (level) => level + 1);
```

---

## 📌 Array Manipulation

### `append(key, array)`
Adds values to an existing array.

**Example: Adding Pokémon to a trainer’s list**
```ts
await db.append("trainer.pokemon", ["Charizard"]);
```

---

### `unique(key)`
Removes duplicate values from an array.

**Example: Cleaning up an inventory**
```ts
await db.unique("inventory.items");
```

---

## 📌 Metadata Methods

### `keys()`
Returns all stored keys.

**Example: Listing all database entries**
```ts
console.log(await db.keys());
```

---

### `values()`
Returns all stored values.

**Example: Getting all saved data**
```ts
console.log(await db.values());
```

---

## 🚀 Conclusion

Light-DB is a powerful, lightweight JSON database that makes it easy to store, retrieve, and manipulate data with async operations.
