import fs from 'fs'
import winston from 'winston'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const logDir = path.join(__dirname, '../../logs')
if (isProd && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
      const base = `${timestamp} [${level}] ${message}`
      return stack ? `${base}\n${stack}` : base
    })
  ),
  transports: [
    new winston.transports.Console(),
    ...(isProd
      ? [
          new winston.transports.File({
            filename: path.join(__dirname, '../../logs/app.log'),
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
          }),
        ]
      : []),
  ],
})

export default logger
