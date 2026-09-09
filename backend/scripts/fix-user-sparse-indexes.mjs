#!/usr/bin/env node
/**
 * 修复 users 集合中 wechatOpenId / friendCode 为 null 导致 sparse 唯一索引冲突的问题。
 *
 * 用法（在 backend 目录）:
 *   node scripts/fix-user-sparse-indexes.mjs
 */
import mongoose from 'mongoose'
import config from '../src/config/index.js'
import User from '../src/models/User.js'
import { generateFriendCode } from '../src/utils/friendCode.js'

async function allocateFriendCode() {
  for (let i = 0; i < 12; i += 1) {
    const code = generateFriendCode(8)
    const exists = await User.exists({ friendCode: code })
    if (!exists) return code
  }
  throw new Error('好友号生成失败')
}

async function main() {
  await mongoose.connect(config.mongodbUri)

  const unsetWechat = await User.updateMany({ wechatOpenId: null }, { $unset: { wechatOpenId: 1 } })
  const unsetFriend = await User.updateMany({ friendCode: null }, { $unset: { friendCode: 1 } })
  console.log(`已清除 wechatOpenId=null: ${unsetWechat.modifiedCount} 条`)
  console.log(`已清除 friendCode=null: ${unsetFriend.modifiedCount} 条`)

  const missingFriend = await User.find({
    $or: [{ friendCode: { $exists: false } }, { friendCode: '' }],
  })
  let backfilled = 0
  for (const user of missingFriend) {
    user.friendCode = await allocateFriendCode()
    await user.save()
    backfilled += 1
  }
  console.log(`已补全 friendCode: ${backfilled} 条`)

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
