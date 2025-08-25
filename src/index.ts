import Storage from "./storage";

interface LightDBOptions {
  pretty?: boolean;
  backup?: boolean;
}

export default function lightdb(
  dbName: string,
  dirPath: string = "db",
  options: LightDBOptions = {}
): Storage {
  return new Storage(dirPath, dbName, options);
}

// Export types for TypeScript users
export type { LightDBOptions };
export { Storage };
