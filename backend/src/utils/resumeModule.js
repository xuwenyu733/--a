import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const resumeBase = path.join(__dirname, '../../resume-module')

export const resumeReq = createRequire(path.join(resumeBase, 'app.js'))
