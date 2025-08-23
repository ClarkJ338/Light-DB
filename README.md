# Light-DB

## ⚡ Quick Reference

| Category  | Methods |
|-----------|---------|
| **CRUD**  | `get`, `set`, `has`, `delete`, `update`, `toggle` |
| **Math**  | `plus`, `minus`, `multiple`, `divide` |
| **Array** | `append`, `unique`, `sort`, `reverse`, `find`, `filter`, `slice` |
| **Retrieval** | `keys`, `values` |
| **Utility** | `saveNow`, `enableCache`, `disableCache`, `getCacheInfo` |


**Light-DB** is a **fully async**, lightweight JSON-based database for Node.js.  
It provides a simple interface for storing, retrieving, and managing structured data in JSON format.

## Features

✔️ Fully **async/await** support  
✔️ Simple **key-value storage**  
✔️ Supports **nested objects**  
✔️ **CRUD operations** (set, get, delete, has)  
✔️ **Math operations** (plus, minus, multiple, divide)  
✔️ **Array manipulation** (append, unique, sort, filter, slice)  
✔️ **Boolean toggling**  
✔️ **Merging objects**  
✔️ **Works out of the box** (no database setup needed)  

---

## Installation

```sh
npm install @trainersky/light-db
```

---

## Usage

### **Basic Example**
```ts
import { createDB } from "@trainersky/light-db";

// Default cache (2MB)
const db = createDB("./data", "myDatabase");

async function run() {
  await db.set("user", { name: "Ash", age: 10 });
  console.log(await db.get("user")); // { name: "Ash", age: 10 }

  await db.plus("user.age", 1);
  console.log(await db.get("user.age")); // 11

  await db.toggle("user.active");
  console.log(await db.get("user.active")); // true

  // Force save immediately (skips batching)
  await db.saveNow();
}

run();
```


const db = lightdb("myDatabase", "./data");

async function run() {
  await db.set("user", { name: "Ash", age: 10 });
  console.log(await db.get("user")); // { name: "Ash", age: 10 }

  await db.plus("user.age", 1);
  console.log(await db.get("user.age")); // 11

  await db.toggle("user.active");
  console.log(await db.get("user.active")); // true
}

run();
```

---

## Methods

### **CRUD Operations**
| Method               | Description |
|----------------------|-------------|
| `set(key, value)`   | Stores data at a given key |
| `get(key, default?)` | Retrieves data from a key |
| `has(key)`          | Checks if a key exists |
| `delete(key)`       | Removes a key |
| `update(key, value)` | Updates data at given key and value |

### **Math Operations**
| Method               | Description |
|----------------------|-------------|
| `plus(key, amount)`  | Increments a number |
| `minus(key, amount)` | Decrements a number |
| `multiple(key, factor)` | Multiplies a number |
| `divide(key, divisor)` | Divides a number (prevents division by zero) |

### **Object & Boolean Manipulation**
| Method              | Description |
|----------------------|-------------|
| `merge(key, object)` | Merges an object into existing data |
| `toggle(key)`       | Flips a boolean value |

### **Array Manipulation**
| Method               | Description |
|----------------------|-------------|
| `append(key, array)` | Adds elements to an array |
| `unique(key)`       | Removes duplicate values from an array |
| `sort(key)`         | Sorts an array |
| `reverse(key)`      | Reverses an array |
| `find(key, fn)`     | Finds an item in an array |
| `filter(key, fn)`   | Filters items in an array |
| `slice(key, start, end?)` | Returns a portion of an array |

### **Retrieving Keys & Values**
### **Cache Configuration**
| Option         | Description |
|
### **Utility**
| Method       | Description |
|--------------|-------------|
| `saveNow()`  | Immediately flushes any pending writes to disk (skips batching) |
----------------|-------------|
| `cacheLimit`   | Maximum cache size in bytes (default: 2MB). Set `0` to disable cache. |

```ts
import { createDB } from "@trainersky/light-db";

// Custom cache size (5MB)
const db = createDB("./data", "logs", { cacheLimit: 5 * 1024 * 1024 });

// Disable cache (always disk mode)
const bigdb = createDB("./data", "bigdata", { cacheLimit: 0 });
```

| Method               | Description |
|----------------------|-------------|
| `keys()`            | Returns all stored keys |
| `values()`          | Returns all stored values |

---

## Running Tests

```sh
npm install
npm run build
npm test
```

---

##  Why Use Light-DB?

✔️ **No database setup required** – just install and use  
✔️ **Blazing fast performance** for small & medium-scale apps  
✔️ **Human-readable JSON storage**  
✔️ **Ideal for small projects, bots, or caching data**  

---

## Contributing

Feel free to **open an issue** or **submit a pull request** on GitHub.  

**GitHub Repository:** [Light-DB](https://github.com/TrainerSky/Light-DB)

---

## License

**Light-DB** is **MIT licensed**.  
Enjoy using it! 🚀