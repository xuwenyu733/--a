import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongoServer

export async function connectTestDb() {
  if (mongoose.connection.readyState === 1) return
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
}

export async function disconnectTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  if (mongoServer) {
    await mongoServer.stop()
    mongoServer = null
  }
}

export async function clearCollections() {
  const { collections } = mongoose.connection
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})))
}
