/**
 * 确保微信提审测试账号存在且已学生认证。
 * 用法：cd backend && node scripts/ensure-review-account.js
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const phone = (process.env.WECHAT_REVIEW_PHONES || '13800000003').split(',')[0].trim()
const password = process.env.WECHAT_REVIEW_PASSWORD || 'student123'

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_secondhand'
  await mongoose.connect(uri)
  const User = (await import('../src/models/User.js')).default
  const Region = (await import('../src/models/Region.js')).default
  const { ROLES } = await import('../src/constants/roles.js')
  const { generateFriendCode } = await import('../src/utils/friendCode.js')

  let region = await Region.findOne({ status: 'active' })
  if (!region) {
    region = await Region.create({
      name: '示范大学校园',
      code: 'demo-campus',
      status: 'active',
    })
  }

  let user = await User.findOne({ phone }).select('+password')
  const hashed = await bcrypt.hash(password, 10)
  if (!user) {
    user = await User.create({
      phone,
      password: hashed,
      nickname: '提审测试学生',
      role: ROLES.STUDENT,
      regionId: region._id,
      status: 'active',
      studentVerified: true,
      friendCode: generateFriendCode(8),
      studentInfo: {
        studentId: '2024001999',
        realName: '提审账号',
        enrollYear: 2024,
        college: '计算机学院',
      },
    })
    console.log('已创建提审账号', phone)
  } else {
    user.password = hashed
    user.role = ROLES.STUDENT
    user.status = 'active'
    user.studentVerified = true
    user.regionId = user.regionId || region._id
    if (!user.nickname) user.nickname = '提审测试学生'
    await user.save()
    console.log('已更新提审账号', phone)
  }

  console.log('登录方式: 手机号+密码')
  console.log('手机号:', phone)
  console.log('密码:', password)
  console.log('studentVerified: true')
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
