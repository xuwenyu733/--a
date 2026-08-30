import mongoose from 'mongoose'
import config from './index.js'
import logger from '../utils/logger.js'

export async function connectDB() {
  try {
    await mongoose.connect(config.mongodbUri, {
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || 15,
      minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE) || 3,
      serverSelectionTimeoutMS: 5000,
    })
    logger.info('MongoDB 连接成功')
  } catch (err) {
    logger.error(`MongoDB 连接失败: ${err.message}`)
    process.exit(1)
  }
}
