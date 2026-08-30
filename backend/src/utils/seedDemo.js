/**
 * 演示数据填充脚本（依赖 npm run seed 已创建的基础账号与区域）
 * 用法: node src/utils/seedDemo.js [--force]
 */
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import config from '../config/index.js'
import logger from '../utils/logger.js'
import Region from '../models/Region.js'
import User from '../models/User.js'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import Favorite from '../models/Favorite.js'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import Notification from '../models/Notification.js'
import DeliveryOrder from '../models/DeliveryOrder.js'
import DeliveryZone from '../models/DeliveryZone.js'
import TradeReview from '../models/TradeReview.js'
import ResumeRecord from '../models/ResumeRecord.js'
import Verification from '../models/Verification.js'
import Report from '../models/Report.js'
import ProductBrowse from '../models/ProductBrowse.js'
import SearchHistory from '../models/SearchHistory.js'
import AuditLog from '../models/AuditLog.js'
import PaymentTransaction from '../models/PaymentTransaction.js'
import CourierProfile from '../models/CourierProfile.js'
import SystemConfig from '../models/SystemConfig.js'
import { ROLES } from '../constants/roles.js'
import {
  DELIVERY_ORDER_STATUS,
  DELIVERY_ORDER_TYPES,
} from '../constants/delivery.js'
import { PAYMENT_CHANNEL, PAYMENT_PROVIDER, PAYMENT_TX_STATUS } from '../constants/payment.js'
import { buildProductSearchText } from './productPinyin.js'
import { ensureDemoImageFiles, imagesForProduct, needsLocalImageMigration } from './demoProductImages.js'
import { DEFAULT_CONFIG } from '../services/configService.js'

const DEMO_SEED_VERSION = '3'
const DEMO_TAG = 'demo'
const DEMO_PHONES = ['13800000004', '13800000005', '13800000006', '13800000007', '13800000008']
const DEMO_PASSWORD = 'student123'

const force = process.argv.includes('--force')

function sortParticipantIds(id1, id2) {
  const a = id1.toString()
  const b = id2.toString()
  return a < b ? [id1, id2] : [id2, id1]
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function hoursAgo(n) {
  return new Date(Date.now() - n * 60 * 60 * 1000)
}

async function purgeDemoData(demoUserIds) {
  if (!demoUserIds.length) return

  const demoProducts = await Product.find({ tags: DEMO_TAG }).select('_id')
  const demoProductIds = demoProducts.map((p) => p._id)

  const demoOrders = await Order.find({
    $or: [{ buyerId: { $in: demoUserIds } }, { sellerId: { $in: demoUserIds } }, { productId: { $in: demoProductIds } }],
  }).select('_id')
  const demoOrderIds = demoOrders.map((o) => o._id)

  const demoConversations = await Conversation.find({ participants: { $in: demoUserIds } }).select('_id')
  const demoConvIds = demoConversations.map((c) => c._id)

  await Promise.all([
    Message.deleteMany({ $or: [{ senderId: { $in: demoUserIds } }, { receiverId: { $in: demoUserIds } }] }),
    Conversation.deleteMany({ _id: { $in: demoConvIds } }),
    Notification.deleteMany({ userId: { $in: demoUserIds } }),
    Favorite.deleteMany({ userId: { $in: demoUserIds } }),
    TradeReview.deleteMany({ $or: [{ reviewerId: { $in: demoUserIds } }, { revieweeId: { $in: demoUserIds } }] }),
    PaymentTransaction.deleteMany({ $or: [{ buyerId: { $in: demoUserIds } }, { orderId: { $in: demoOrderIds } }] }),
    Order.deleteMany({ _id: { $in: demoOrderIds } }),
    DeliveryOrder.deleteMany({ $or: [{ posterId: { $in: demoUserIds } }, { courierId: { $in: demoUserIds } }] }),
    ResumeRecord.deleteMany({ userId: { $in: demoUserIds } }),
    Verification.deleteMany({ userId: { $in: demoUserIds } }),
    Report.deleteMany({ reporterId: { $in: demoUserIds } }),
    ProductBrowse.deleteMany({ userId: { $in: demoUserIds } }),
    SearchHistory.deleteMany({ userId: { $in: demoUserIds } }),
    Product.deleteMany({ tags: DEMO_TAG }),
    CourierProfile.deleteMany({ userId: { $in: demoUserIds } }),
    User.deleteMany({ _id: { $in: demoUserIds } }),
  ])

  await SystemConfig.deleteOne({ key: 'demo_seed_version' })
  logger.info('🗑️  已清除旧演示数据')
}

async function ensureDemoUsers(regionId, studentTemplate) {
  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10)
  const specs = [
    {
      phone: '13800000004',
      nickname: '李明（骑手）',
      studentVerified: true,
      courierVerified: true,
      studentInfo: { studentId: '2024002001', realName: '李明', enrollYear: 2024, college: '经济学院' },
    },
    {
      phone: '13800000005',
      nickname: '王小花',
      studentVerified: true,
      studentInfo: { studentId: '2024002002', realName: '王小花', enrollYear: 2023, college: '外国语学院' },
    },
    {
      phone: '13800000006',
      nickname: '赵强',
      studentVerified: true,
      studentInfo: { studentId: '2024002003', realName: '赵强', enrollYear: 2022, college: '机械学院' },
    },
    {
      phone: '13800000007',
      nickname: '陈小雨',
      studentVerified: false,
      studentInfo: { studentId: '2024002004', realName: '陈小雨', enrollYear: 2024, college: '艺术学院' },
    },
    {
      phone: '13800000008',
      nickname: '周杰',
      studentVerified: true,
      studentInfo: { studentId: '2024002005', realName: '周杰', enrollYear: 2023, college: '计算机学院' },
    },
  ]

  const users = {}
  for (const spec of specs) {
    let user = await User.findOne({ phone: spec.phone })
    if (!user) {
      const { generateFriendCode } = await import('../utils/friendCode.js')
      let friendCode = generateFriendCode(8)
      while (await User.exists({ friendCode })) friendCode = generateFriendCode(8)
      user = await User.create({
        phone: spec.phone,
        password: hashed,
        wechatOpenId: `demo_${spec.phone}`,
        nickname: spec.nickname,
        friendCode,
        role: ROLES.STUDENT,
        regionId,
        status: 'active',
        creditScore: 100,
        studentVerified: spec.studentVerified,
        courierVerified: spec.courierVerified || false,
        studentInfo: spec.studentInfo,
      })
    } else if (!user.friendCode) {
      const { ensureFriendCode } = await import('../services/friendService.js')
      user = await ensureFriendCode(user)
    }
    users[spec.phone] = user
  }
  return users
}

function buildProductSamples({ student, merchant, student2, zhao, zhou, chen, regionId }) {
  const base = (p) => {
    const { imageCount, images, ...rest } = p
    return {
      ...rest,
      images: images ?? imagesForProduct(p.title, imageCount ?? 1, rest.category),
      regionId,
      tags: [DEMO_TAG],
      searchText: buildProductSearchText(p.title),
    }
  }

  return [
    base({
      sellerId: student._id,
      sellerType: 'student',
      title: '线性代数辅导讲义',
      description: '期末复习必备，有少量铅笔笔记，附赠错题本',
      price: 15,
      originalPrice: 35,
      category: 'book',
      condition: 'good',
      status: 'on_sale',
      location: '图书馆旁',
      viewCount: 42,
      favoriteCount: 3,
      imageCount: 2,
    }),
    base({
      sellerId: student2._id,
      sellerType: 'student',
      title: '大学英语四级真题集',
      description: '近五年真题，答案完整',
      price: 20,
      category: 'book',
      condition: 'like_new',
      status: 'on_sale',
      location: '南区宿舍',
      viewCount: 28,
    }),
    base({
      sellerId: student._id,
      sellerType: 'student',
      title: '小米蓝牙耳机',
      description: '使用半年，音质正常，含充电盒',
      price: 89,
      originalPrice: 199,
      category: 'electronics',
      condition: 'good',
      status: 'on_sale',
      location: '西区',
      viewCount: 65,
      favoriteCount: 5,
      imageCount: 2,
    }),
    base({
      sellerId: student2._id,
      sellerType: 'student',
      title: '机械键盘 青轴',
      description: '九成新，宿舍自用，可试打',
      price: 180,
      category: 'electronics',
      condition: 'like_new',
      status: 'on_sale',
      location: '北区宿舍',
      viewCount: 91,
      imageCount: 3,
    }),
    base({
      sellerId: merchant._id,
      sellerType: 'merchant',
      title: '笔记本 A5 80页',
      description: '课堂笔记必备，多色封面随机',
      price: 6,
      category: 'daily',
      condition: 'new',
      status: 'on_sale',
      location: '东区商业街',
      viewCount: 15,
    }),
    base({
      sellerId: merchant._id,
      sellerType: 'merchant',
      title: '洗衣液 2L 装',
      description: '宿舍团购余量，未开封',
      price: 22,
      category: 'daily',
      condition: 'new',
      status: 'on_sale',
      location: '东区商业街',
      viewCount: 33,
    }),
    base({
      sellerId: student._id,
      sellerType: 'student',
      title: '冬季羽绒服 L码',
      description: '只穿一季，保暖性好',
      price: 120,
      originalPrice: 399,
      category: 'clothing',
      condition: 'good',
      status: 'on_sale',
      location: '女生宿舍区',
      viewCount: 47,
      imageCount: 2,
    }),
    base({
      sellerId: student2._id,
      sellerType: 'student',
      title: '篮球鞋 42码',
      description: '实战两次，鞋底磨损轻微',
      price: 200,
      category: 'clothing',
      condition: 'like_new',
      status: 'on_sale',
      location: '体育馆旁',
      viewCount: 38,
    }),
    base({
      sellerId: student._id,
      sellerType: 'student',
      title: '台灯 护眼LED',
      description: '三档调光，毕业甩卖',
      price: 35,
      category: 'other',
      condition: 'good',
      status: 'on_sale',
      location: '东区宿舍',
      viewCount: 22,
    }),
    base({
      sellerId: student2._id,
      sellerType: 'student',
      title: '瑜伽垫',
      description: '加厚防滑，送收纳袋',
      price: 28,
      category: 'other',
      condition: 'like_new',
      status: 'on_sale',
      location: '健身房旁',
      viewCount: 19,
    }),
    base({
      sellerId: student._id,
      sellerType: 'student',
      title: '数据结构与算法教材',
      description: '考研复习用书，无缺页',
      price: 30,
      category: 'book',
      condition: 'good',
      status: 'sold',
      location: '计算机楼',
      viewCount: 55,
    }),
    base({
      sellerId: merchant._id,
      sellerType: 'merchant',
      title: '考试专用计算器',
      description: '符合考场规定型号',
      price: 45,
      category: 'electronics',
      condition: 'new',
      status: 'on_sale',
      location: '东区商业街',
      viewCount: 12,
    }),
    base({
      sellerId: student2._id,
      sellerType: 'student',
      title: '宿舍小冰箱',
      description: '一学期自用，制冷正常',
      tradeMode: 'sell',
      price: 280,
      category: 'electronics',
      condition: 'good',
      status: 'on_sale',
      location: '南区宿舍',
      viewCount: 103,
      favoriteCount: 8,
      imageCount: 3,
      groupBuy: {
        enabled: true,
        minCount: 2,
        groupPrice: 250,
        status: 'open',
        participants: [{ userId: student2._id, joinedAt: daysAgo(1) }],
      },
    }),
    base({
      sellerId: student._id,
      sellerType: 'student',
      title: 'Switch 游戏卡带 塞尔达',
      description: '通关出，盒说全',
      price: 240,
      category: 'other',
      condition: 'like_new',
      status: 'on_sale',
      location: '电竞社',
      viewCount: 77,
      groupBuy: {
        enabled: true,
        minCount: 3,
        groupPrice: 220,
        status: 'open',
        participants: [
          { userId: student._id, joinedAt: daysAgo(2) },
          { userId: student2._id, joinedAt: daysAgo(1) },
        ],
      },
    }),
    base({
      sellerId: merchant._id,
      sellerType: 'merchant',
      title: '复印纸 A4 5包装',
      description: '期末打印季特惠，可拼单',
      price: 80,
      category: 'daily',
      condition: 'new',
      status: 'on_sale',
      location: '东区商业街',
      viewCount: 41,
      groupBuy: {
        enabled: true,
        minCount: 2,
        groupPrice: 70,
        status: 'success',
        participants: [
          { userId: merchant._id, joinedAt: daysAgo(5) },
          { userId: student._id, joinedAt: daysAgo(4) },
          { userId: student2._id, joinedAt: daysAgo(3) },
        ],
      },
    }),
    base({
      sellerId: zhou._id,
      sellerType: 'student',
      title: '考研政治笔记整理',
      description: '肖秀荣+腿姐笔记，重点标红',
      price: 18,
      category: 'book',
      condition: 'like_new',
      status: 'on_sale',
      location: '文科楼',
      viewCount: 36,
      imageCount: 2,
    }),
    base({
      sellerId: zhao._id,
      sellerType: 'student',
      title: '羽毛球拍 双拍套装',
      description: '送球和拍套，适合新手',
      price: 65,
      category: 'other',
      condition: 'good',
      status: 'on_sale',
      location: '体育馆',
      viewCount: 24,
      imageCount: 2,
    }),
    base({
      sellerId: zhou._id,
      sellerType: 'student',
      title: '牛仔外套 M码',
      description: '百搭款，洗过两次',
      price: 55,
      category: 'clothing',
      condition: 'good',
      status: 'on_sale',
      location: '南区宿舍',
      viewCount: 31,
      imageCount: 2,
    }),
    base({
      sellerId: merchant._id,
      sellerType: 'merchant',
      title: '水桶脸盆六件套',
      description: '新生入学套装，颜色可选',
      price: 35,
      category: 'daily',
      condition: 'new',
      status: 'on_sale',
      location: '东区商业街',
      viewCount: 18,
    }),
    base({
      sellerId: merchant._id,
      sellerType: 'merchant',
      title: 'iPad 配件礼包',
      description: '保护壳+钢化膜+触控笔，多型号可选',
      price: 68,
      category: 'electronics',
      condition: 'new',
      status: 'on_sale',
      location: '东区商业街',
      viewCount: 44,
      imageCount: 3,
    }),
    base({
      sellerId: zhao._id,
      sellerType: 'student',
      title: '民谣吉他 九成新',
      description: '想换一副头戴耳机，支持面交试弹',
      price: 0,
      category: 'other',
      tradeMode: 'exchange',
      condition: 'like_new',
      status: 'on_sale',
      location: '艺术楼',
      viewCount: 52,
      imageCount: 2,
    }),
    base({
      sellerId: student2._id,
      sellerType: 'student',
      title: '斜挎包 帆布款',
      description: '已下架，留作演示',
      price: 25,
      category: 'clothing',
      condition: 'good',
      status: 'off_shelf',
      location: '西区宿舍',
      viewCount: 8,
    }),
    base({
      sellerId: chen._id,
      sellerType: 'student',
      title: '二手显卡 RTX3060',
      description: '违规下架演示数据',
      price: 1200,
      category: 'electronics',
      condition: 'good',
      status: 'rejected',
      location: '工科楼',
      viewCount: 0,
      imageCount: 1,
    }),
    base({
      sellerId: student._id,
      sellerType: 'student',
      title: 'C语言程序设计教材',
      description: '谭浩强版，有少量划线',
      price: 12,
      category: 'book',
      condition: 'fair',
      status: 'on_sale',
      location: '计算机楼',
      viewCount: 17,
    }),
    base({
      sellerId: student2._id,
      sellerType: 'student',
      title: '保温杯 500ml',
      description: '304不锈钢，保温效果好',
      price: 18,
      category: 'daily',
      condition: 'like_new',
      status: 'on_sale',
      location: '北区食堂旁',
      viewCount: 26,
      imageCount: 2,
    }),
  ]
}

async function cleanupJunkProducts() {
  const junk = await Product.find({
    $or: [{ title: '徐文宇' }, { price: { $gt: 999999 } }],
  }).select('_id title')
  if (!junk.length) return 0
  await Product.deleteMany({ _id: { $in: junk.map((p) => p._id) } })
  logger.info(`🗑️  已删除异常商品 ${junk.length} 条（${junk.map((p) => p.title).join('、')}）`)
  return junk.length
}

async function migrateProductImages(regionId) {
  await ensureDemoImageFiles()
  const products = await Product.find({ regionId, deletedAt: null }).select('_id title category images')
  const toFix = products.filter((p) => needsLocalImageMigration(p.images))
  if (!toFix.length) return 0

  await Promise.all(
    toFix.map((p) => {
      const count = Math.min(Math.max(p.images?.length || 1, 1), 3)
      return Product.updateOne(
        { _id: p._id },
        { $set: { images: imagesForProduct(p.title, count, p.category) } }
      )
    })
  )
  return toFix.length
}

async function ensureDemoProducts(ctx) {
  const samples = buildProductSamples(ctx)
  const existing = await Product.find({ tags: DEMO_TAG }).select('title')
  const titles = new Set(existing.map((p) => p.title))
  const toInsert = samples.filter((s) => !titles.has(s.title))

  if (toInsert.length) {
    await Product.insertMany(toInsert)
    logger.info(`✅ 新增演示商品 ${toInsert.length} 条`)
  }

  const filled = await migrateProductImages(ctx.regionId)
  if (filled) logger.info(`✅ 商品图片迁移为本地 ${filled} 条`)

  return Product.find({ regionId: ctx.regionId, deletedAt: null })
}

async function seedDemo() {
  await mongoose.connect(config.mongodbUri)
  logger.info('🌱 开始填充演示数据...')

  const region = await Region.findOne({ code: 'demo_campus' })
  if (!region) {
    logger.error('❌ 未找到示范区域，请先运行: npm run seed')
    process.exit(1)
  }

  const [student, merchant, agent] = await Promise.all([
    User.findOne({ phone: '13800000003' }),
    User.findOne({ phone: '13800000002' }),
    User.findOne({ phone: '13800000001' }),
  ])
  if (!student || !merchant) {
    logger.error('❌ 基础测试账号不存在，请先运行: npm run seed')
    process.exit(1)
  }

  const existingDemoUsers = await User.find({ phone: { $in: DEMO_PHONES } }).select('_id')
  const demoUserIds = existingDemoUsers.map((u) => u._id)

  const versionDoc = await SystemConfig.findOne({ key: 'demo_seed_version' })
  if (versionDoc?.value === DEMO_SEED_VERSION && !force) {
    await cleanupJunkProducts()
    const demoUsers = await ensureDemoUsers(region._id)
    await ensureDemoProducts({
      student,
      merchant,
      student2: demoUsers['13800000005'],
      zhao: demoUsers['13800000006'],
      zhou: demoUsers['13800000008'],
      chen: demoUsers['13800000007'],
      regionId: region._id,
    })
    logger.info('ℹ️  演示数据已是最新（版本', DEMO_SEED_VERSION, '），已同步商品。使用 --force 可重新填充')
    await mongoose.disconnect()
    return
  }

  await cleanupJunkProducts()

  if (force) {
    await purgeDemoData(demoUserIds)
  }

  const demoUsers = await ensureDemoUsers(region._id)
  const courier = demoUsers['13800000004']
  const wang = demoUsers['13800000005']
  const zhao = demoUsers['13800000006']
  const chen = demoUsers['13800000007']
  const zhou = demoUsers['13800000008']

  const zones = await DeliveryZone.find({ regionId: region._id, status: 'active' }).sort({ sortOrder: 1 })
  if (!zones.length) {
    logger.error('❌ 配送区域为空，请先运行: npm run seed')
    process.exit(1)
  }
  const zone1 = zones[0]
  const zone2 = zones[1] || zone1

  // 商品（含图片、多分类、拼单/交换/下架等状态）
  const products = await ensureDemoProducts({
    student,
    merchant,
    student2: wang,
    zhao,
    zhou,
    chen,
    regionId: region._id,
  })
  const demoCount = products.filter((p) => p.tags?.includes(DEMO_TAG)).length
  logger.info(`✅ 演示商品共 ${demoCount} 条（含封面图）`)

  const onSaleProducts = products.filter((p) => p.status === 'on_sale')
  const soldProduct = products.find((p) => p.status === 'sold') || onSaleProducts[0]

  // 骑手资料
  let courierProfile = await CourierProfile.findOne({ userId: courier._id })
  if (!courierProfile) {
    courierProfile = await CourierProfile.create({
      userId: courier._id,
      regionId: region._id,
      realName: '李明',
      contactPhone: courier.phone,
      serviceTypes: ['food', 'express', 'other'],
      intro: '熟悉校园路线，接单快、态度好',
      allowedZoneIds: zones.slice(0, 4).map((z) => z._id),
      status: 'active',
      stats: { orderCount: 12, completedCount: 10, rating: 4.9 },
    })
    courier.courierProfileId = courierProfile._id
    await courier.save()
    logger.info('✅ 骑手资料 1 条')
  }

  // 认证记录
  const verificationCount = await Verification.countDocuments({ userId: { $in: [chen._id, courier._id] } })
  if (!verificationCount) {
    await Verification.insertMany([
      {
        userId: chen._id,
        regionId: region._id,
        type: 'student',
        status: 'pending',
        payload: { studentId: '2024002004', realName: '陈小雨', college: '艺术学院', enrollYear: 2024 },
      },
      {
        userId: courier._id,
        regionId: region._id,
        type: 'courier',
        status: 'approved',
        payload: { realName: '李明', idCard: '3502**********1234', emergencyContact: '13900001111' },
        reviewerId: agent?._id || null,
        reviewedAt: daysAgo(10),
      },
    ])
    logger.info('✅ 认证记录 2 条（待审学生 + 已通过骑手）')
  }

  // 收藏
  const favCount = await Favorite.countDocuments({ userId: zhou._id })
  if (!favCount) {
    const favTargets = onSaleProducts.slice(0, 4)
    await Favorite.insertMany(
      favTargets.map((p) => ({
        userId: zhou._id,
        productId: p._id,
        priceAtFavorite: p.price,
        createdAt: daysAgo(Math.floor(Math.random() * 5) + 1),
      }))
    )
    await Product.updateMany(
      { _id: { $in: favTargets.map((p) => p._id) } },
      { $inc: { favoriteCount: 1 } }
    )
    logger.info(`✅ 收藏 ${favTargets.length} 条`)
  }

  // 订单
  let orders = await Order.find({
    $or: [{ buyerId: zhou._id }, { buyerId: wang._id }],
  }).limit(10)
  if (!orders.length) {
    const p1 = onSaleProducts[0]
    const p2 = onSaleProducts[1]
    const p3 = soldProduct
    orders = await Order.insertMany([
      {
        regionId: region._id,
        productId: p3._id,
        buyerId: wang._id,
        sellerId: p3.sellerId,
        sellerType: p3.sellerType,
        price: p3.price,
        status: 'completed',
        remark: '图书馆门口面交',
        completedAt: daysAgo(3),
        paymentStatus: 'seller_confirmed',
        paymentMethod: 'wechat',
        buyerPaidAt: daysAgo(3),
        createdAt: daysAgo(5),
      },
      {
        regionId: region._id,
        productId: p1._id,
        buyerId: zhou._id,
        sellerId: p1.sellerId,
        sellerType: p1.sellerType,
        price: p1.price,
        status: 'confirmed',
        remark: '今晚七点东区见',
        paymentStatus: 'buyer_marked',
        paymentMethod: 'wechat',
        buyerPaidAt: hoursAgo(2),
        createdAt: daysAgo(1),
      },
      {
        regionId: region._id,
        productId: p2._id,
        buyerId: zhou._id,
        sellerId: p2.sellerId,
        sellerType: p2.sellerType,
        price: p2.price,
        status: 'confirmed',
        remark: '能便宜五块吗？',
        createdAt: hoursAgo(5),
      },
      {
        regionId: region._id,
        productId: onSaleProducts[2]._id,
        buyerId: wang._id,
        sellerId: onSaleProducts[2].sellerId,
        sellerType: onSaleProducts[2].sellerType,
        price: onSaleProducts[2].price,
        status: 'cancelled',
        cancelReason: '买家临时有事',
        createdAt: daysAgo(2),
      },
    ])
    logger.info(`✅ 订单 ${orders.length} 条`)
  }

  const completedOrder = orders.find((o) => o.status === 'completed')

  // 评价
  if (completedOrder) {
    const reviewExists = await TradeReview.findOne({ orderId: completedOrder._id })
    if (!reviewExists) {
      await TradeReview.create({
        orderId: completedOrder._id,
        reviewerId: completedOrder.buyerId,
        revieweeId: completedOrder.sellerId,
        rating: 5,
        content: '卖家很守时，书成色和描述一致，推荐！',
        createdAt: daysAgo(2),
      })
      logger.info('✅ 交易评价 1 条')
    }
  }

  // 支付流水
  if (completedOrder) {
    const txExists = await PaymentTransaction.findOne({ orderId: completedOrder._id })
    if (!txExists) {
      await PaymentTransaction.create({
        paymentNo: `DEMO${Date.now()}01`,
        orderId: completedOrder._id,
        buyerId: completedOrder.buyerId,
        sellerId: completedOrder.sellerId,
        amount: completedOrder.price,
        channel: PAYMENT_CHANNEL.WECHAT,
        status: PAYMENT_TX_STATUS.PAID,
        provider: PAYMENT_PROVIDER.SANDBOX,
        paidAt: daysAgo(3),
        expiredAt: daysAgo(2),
      })
      logger.info('✅ 支付流水 1 条')
    }
  }

  // 聊天
  const convCount = await Conversation.countDocuments({ participants: student._id })
  if (convCount < 2) {
    const productForChat = onSaleProducts[3] || onSaleProducts[0]
    const [p1, p2] = sortParticipantIds(student._id, zhou._id)
    const counts = new Map()
    counts.set(p1.toString(), 0)
    counts.set(p2.toString(), 1)

    const conv1 = await Conversation.create({
      participants: [p1, p2],
      productId: productForChat._id,
      unreadCounts: counts,
      lastMessage: {
        content: '你好，这个还在吗？',
        type: 'text',
        senderId: zhou._id,
        createdAt: hoursAgo(1),
      },
    })

    await Message.insertMany([
      {
        conversationId: conv1._id,
        senderId: zhou._id,
        receiverId: student._id,
        type: 'text',
        content: '你好，这个键盘还在吗？',
        read: true,
        readAt: hoursAgo(2),
        createdAt: hoursAgo(3),
      },
      {
        conversationId: conv1._id,
        senderId: student._id,
        receiverId: zhou._id,
        type: 'text',
        content: '在的，今晚可以面交',
        read: true,
        readAt: hoursAgo(2),
        createdAt: hoursAgo(2),
      },
      {
        conversationId: conv1._id,
        senderId: zhou._id,
        receiverId: student._id,
        type: 'text',
        content: '好的，东区宿舍楼下见',
        read: false,
        createdAt: hoursAgo(1),
      },
    ])

    const [p3, p4] = sortParticipantIds(wang._id, merchant._id)
    const counts2 = new Map()
    counts2.set(p3.toString(), 0)
    counts2.set(p4.toString(), 0)

    const conv2 = await Conversation.create({
      participants: [p3, p4],
      productId: null,
      unreadCounts: counts2,
      lastMessage: {
        content: '明天能送货到南区吗？',
        type: 'text',
        senderId: wang._id,
        createdAt: hoursAgo(4),
      },
    })

    await Message.create({
      conversationId: conv2._id,
      senderId: wang._id,
      receiverId: merchant._id,
      type: 'text',
      content: '老板，明天能送五包纸到南区吗？',
      read: true,
      readAt: hoursAgo(3),
      createdAt: hoursAgo(4),
    })

    logger.info('✅ 会话 2 条、消息 4 条')
  }

  // 通知
  const notifyCount = await Notification.countDocuments({ userId: student._id })
  if (!notifyCount) {
    const confirmedOrder = orders.find((o) => o.status === 'confirmed')
    await Notification.insertMany([
      {
        userId: student._id,
        type: 'new_order',
        title: '您有新的订单',
        content: '周杰下单购买了「线性代数辅导讲义」',
        relatedId: confirmedOrder?._id || orders[0]._id,
        read: false,
        createdAt: hoursAgo(1),
      },
      {
        userId: zhou._id,
        type: 'order_status',
        title: '订单已确认',
        content: '卖家已确认您的订单，请按约定面交',
        relatedId: confirmedOrder?._id || orders[0]._id,
        read: false,
        createdAt: hoursAgo(2),
      },
      {
        userId: zhou._id,
        type: 'price_drop',
        title: '收藏商品降价了',
        content: '「小米蓝牙耳机」降至 ¥85',
        relatedId: onSaleProducts[2]?._id,
        read: true,
        createdAt: daysAgo(1),
      },
      {
        userId: student._id,
        type: 'new_message',
        title: '新消息',
        content: '周杰：好的，东区宿舍楼下见',
        relatedId: (await Conversation.findOne({ participants: { $all: [student._id, zhou._id] } }))?._id,
        read: false,
        createdAt: hoursAgo(1),
      },
      {
        userId: wang._id,
        type: 'group_buy_success',
        title: '拼单成功',
        content: '「复印纸 A4 5包装」拼单已满员',
        relatedId: products.find((p) => p.groupBuy?.status === 'success')?._id,
        read: false,
        createdAt: daysAgo(3),
      },
      {
        userId: courier._id,
        type: 'delivery',
        title: '有新的跑腿单',
        content: '1号公寓有人发布了外卖代取',
        relatedId: null,
        read: false,
        createdAt: hoursAgo(3),
      },
    ])
    logger.info('✅ 通知 6 条')
  }

  // 跑腿订单
  const deliveryCount = await DeliveryOrder.countDocuments({ regionId: region._id })
  if (deliveryCount < 4) {
    await DeliveryOrder.insertMany([
      {
        regionId: region._id,
        zoneId: zone1._id,
        posterId: zhou._id,
        type: DELIVERY_ORDER_TYPES.FOOD,
        title: '南门麻辣烫',
        description: '微辣，加一份宽粉',
        pickupAddress: '南门商业街 麻辣烫店',
        dropoffAddress: `${zone1.name} 302室`,
        contactPhone: zhou.phone,
        fee: 5,
        remark: '到了打电话',
        status: DELIVERY_ORDER_STATUS.OPEN,
        createdAt: hoursAgo(1),
      },
      {
        regionId: region._id,
        zoneId: zone2._id,
        posterId: wang._id,
        courierId: courier._id,
        type: DELIVERY_ORDER_TYPES.EXPRESS,
        title: '菜鸟驿站取件',
        description: '取件码 3-5-2018，一个纸箱',
        pickupAddress: '校内菜鸟驿站',
        dropoffAddress: `${zone2.name} 518室`,
        contactPhone: wang.phone,
        fee: 8,
        status: DELIVERY_ORDER_STATUS.ACCEPTED,
        acceptedAt: hoursAgo(2),
        createdAt: hoursAgo(3),
      },
      {
        regionId: region._id,
        zoneId: zone1._id,
        posterId: zhao._id,
        courierId: courier._id,
        type: DELIVERY_ORDER_TYPES.FOOD,
        title: '食堂打包午饭',
        pickupAddress: '第一食堂 2号窗口',
        dropoffAddress: `${zone1.name} 105室`,
        contactPhone: zhao.phone,
        fee: 4,
        status: DELIVERY_ORDER_STATUS.DELIVERING,
        acceptedAt: hoursAgo(1),
        createdAt: hoursAgo(2),
      },
      {
        regionId: region._id,
        zoneId: zone1._id,
        posterId: student._id,
        courierId: courier._id,
        type: DELIVERY_ORDER_TYPES.OTHER,
        title: '代送文件到行政楼',
        pickupAddress: '图书馆一楼服务台',
        dropoffAddress: '行政楼 203 教务处',
        contactPhone: student.phone,
        fee: 10,
        status: DELIVERY_ORDER_STATUS.COMPLETED,
        acceptedAt: daysAgo(2),
        completedAt: daysAgo(2),
        createdAt: daysAgo(3),
      },
      {
        regionId: region._id,
        zoneId: zone2._id,
        posterId: chen._id,
        type: DELIVERY_ORDER_TYPES.EXPRESS,
        title: '顺丰取件',
        pickupAddress: '北门顺丰网点',
        dropoffAddress: `${zone2.name} 201室`,
        contactPhone: chen.phone,
        fee: 6,
        status: DELIVERY_ORDER_STATUS.CANCELLED,
        cancelReason: '已自行领取',
        cancelledBy: chen._id,
        createdAt: daysAgo(1),
      },
    ])
    logger.info('✅ 跑腿订单 5 条（各状态）')
  }

  // 简历记录
  const resumeCount = await ResumeRecord.countDocuments({ userId: zhou._id })
  if (!resumeCount) {
    await ResumeRecord.insertMany([
      {
        userId: zhou._id,
        fileName: '周杰_前端实习简历.docx',
        originalContent: '教育背景：示范大学 计算机学院 软件工程 2023级\n项目经历：校园二手平台前端开发...',
        optimizedContent:
          '## 周杰\n**示范大学 · 软件工程（2023级）**\n\n### 项目经历\n- 校园二手交易平台：负责 Vue3 小程序端开发与性能优化...',
        suggestions: ['补充量化成果', '突出技术栈关键词', '精简自我评价'],
        style: 'professional',
        sourceType: 'upload',
        jobDescription: '前端开发实习生，熟悉 Vue/React',
      },
      {
        userId: wang._id,
        fileName: '在线简历',
        originalContent: '',
        optimizedContent: '王小花 | 英语专业 | 擅长口语与翻译',
        suggestions: ['增加实习经历', '补充证书信息'],
        style: 'concise',
        sourceType: 'builder',
        builderData: { name: '王小花', major: '英语', phone: wang.phone },
      },
    ])
    logger.info('✅ 简历记录 2 条')
  }

  // 举报
  const reportCount = await Report.countDocuments({ regionId: region._id })
  if (!reportCount) {
    const suspectProduct = onSaleProducts[onSaleProducts.length - 1]
    await Report.insertMany([
      {
        reporterId: zhou._id,
        regionId: region._id,
        targetType: 'product',
        targetId: suspectProduct._id,
        reason: 'fake',
        description: '图片与实物差距较大，怀疑虚假宣传',
        status: 'pending',
      },
      {
        reporterId: wang._id,
        regionId: region._id,
        targetType: 'user',
        targetId: chen._id,
        reason: 'harassment',
        description: '私信言语不当（演示数据）',
        status: 'resolved',
        handlerId: agent?._id,
        handleNote: '已警告并限制私信功能',
        handledAt: daysAgo(1),
      },
    ])
    logger.info('✅ 举报记录 2 条')
  }

  // 浏览历史
  const browseCount = await ProductBrowse.countDocuments({ userId: zhou._id })
  if (!browseCount) {
    await ProductBrowse.insertMany(
      onSaleProducts.slice(0, 6).map((p, i) => ({
        userId: zhou._id,
        productId: p._id,
        regionId: region._id,
        category: p.category,
        viewedAt: daysAgo(i),
      }))
    )
    logger.info('✅ 浏览历史 6 条')
  }

  // 搜索历史
  const searchCount = await SearchHistory.countDocuments({ userId: zhou._id })
  if (!searchCount) {
    await SearchHistory.insertMany([
      { userId: zhou._id, regionId: region._id, keyword: '键盘' },
      { userId: zhou._id, regionId: region._id, keyword: '高数' },
      { userId: wang._id, regionId: region._id, keyword: '耳机' },
      { userId: zhou._id, regionId: region._id, keyword: '台灯' },
    ])
    logger.info('✅ 搜索历史 4 条')
  }

  // 审计日志
  const auditCount = await AuditLog.countDocuments({ regionId: region._id })
  if (!auditCount) {
    await AuditLog.insertMany([
      {
        operatorId: agent?._id || student._id,
        operatorRole: ROLES.REGIONAL_AGENT,
        regionId: region._id,
        action: 'verification.approve',
        targetType: 'verification',
        targetId: courier._id,
        detail: { type: 'courier', realName: '李明' },
        ip: '127.0.0.1',
        createdAt: daysAgo(10),
      },
      {
        operatorId: agent?._id || student._id,
        operatorRole: ROLES.REGIONAL_AGENT,
        regionId: region._id,
        action: 'report.resolve',
        targetType: 'report',
        targetId: new mongoose.Types.ObjectId(),
        detail: { note: '演示：举报已处理' },
        ip: '127.0.0.1',
        createdAt: daysAgo(1),
      },
    ])
    logger.info('✅ 审计日志 2 条')
  }

  // 平台配置
  const platformDoc = await SystemConfig.findOne({ key: 'platform' })
  if (!platformDoc) {
    await SystemConfig.create({ key: 'platform', value: DEFAULT_CONFIG })
    logger.info('✅ 平台配置 1 条')
  }

  await SystemConfig.findOneAndUpdate(
    { key: 'demo_seed_version' },
    { key: 'demo_seed_version', value: DEMO_SEED_VERSION },
    { upsert: true }
  )

  logger.info('\n📋 演示账号（密码均为 student123）:')
  logger.info('  骑手: 13800000004 / 李明（已认证骑手）')
  logger.info('  学生: 13800000005 / 王小花')
  logger.info('  学生: 13800000006 / 赵强')
  logger.info('  学生: 13800000007 / 陈小雨（未认证，有待审记录）')
  logger.info('  学生: 13800000008 / 周杰（有收藏/订单/聊天）')
  logger.info('\n📋 原有测试账号:')
  logger.info('  学生: 13800000003 / student123')
  logger.info('  商家: 13800000002 / merchant123')
  logger.info('  代理: 13800000001 / agent123456')

  await mongoose.disconnect()
  logger.info('\n🎉 演示数据填充完成')
}

seedDemo().catch((err) => {
  logger.error(err)
  process.exit(1)
})
