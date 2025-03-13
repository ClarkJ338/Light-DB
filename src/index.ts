import Storage from "./storage";

export default function lightdb(dbName: string, dirPath: string = "db") {
  return new Storage(dirPath, dbName);
}
