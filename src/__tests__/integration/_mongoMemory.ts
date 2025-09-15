import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod: MongoMemoryServer | null = null;

export async function connectMongoMemory() {
  mongod = await MongoMemoryServer.create({
  });
  const uri = mongod.getUri();
  await mongoose.connect(uri, { dbName: "testdb" });
}

export async function dropData() {
  const db = mongoose.connection.db;
  if (db) await db.dropDatabase();
}

export async function disconnectMongoMemory() {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}
