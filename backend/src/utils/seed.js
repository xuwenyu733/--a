import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import config, { defaultAdminPassword } from '../config/index.js'
import logger from '../utils/logger.js'
import Region from '../models/Region.js'
import User from '../models/User.js'
import { ROLES } from '../constants/roles.js'

async function seed() {
  await mongoose.connect(config.mongodbUri)
  logger.info('🌱 开始初始化数据...')

  await User.updateMany(
    { $or: [{ creditScore: { $exists: false } }, { creditScore: null }] },
    { $set: { creditScore: 100 } }
  )
  await User.updateMany({ wechatOpenId: null }, { $unset: { wechatOpenId: 1 } })
  await User.updateMany({ friendCode: null }, { $unset: { friendCode: 1 } })

  let region = await Region.findOne({ code: 'demo_campus' })
  if (!region) {
    region = await Region.create({
      name: '示范大学校园',
      code: 'demo_campus',
      province: '福建省',
      city: '厦门市',
      address: '示范大学主校区',
      status: 'active',
    })
    logger.info('✅ 创建示范区域:', region.name)
  }

  const superPhone = config.superAdmin.phone
  let superAdmin = await User.findOne({ phone: superPhone })
  if (!superAdmin) {
    const hashed = await bcrypt.hash(config.superAdmin.password, 10)
    superAdmin = await User.create({
      phone: superPhone,
      password: hashed,
      nickname: '超级管理员',
      role: ROLES.SUPER_ADMIN,
      regionId: null,
      status: 'active',
      mustChangePassword: config.superAdmin.password === defaultAdminPassword,
    })
    logger.info(`✅ 创建超级管理员: ${superPhone}`)
  } else {
    logger.info('ℹ️  超级管理员已存在:', superPhone)
  }

  const agentPhone = '13800000001'
  let agent = await User.findOne({ phone: agentPhone })
  if (!agent) {
    const hashed = await bcrypt.hash('agent123456', 10)
    agent = await User.create({
      phone: agentPhone,
      password: hashed,
      nickname: '区域代理',
      role: ROLES.REGIONAL_AGENT,
      regionId: region._id,
      status: 'active',
    })
    region.agentId = agent._id
    await region.save()
    logger.info('✅ 创建区域代理:', agentPhone, '/ agent123456')
  }

  const merchantPhone = '13800000002'
  let merchant = await User.findOne({ phone: merchantPhone })
  if (!merchant) {
    const hashed = await bcrypt.hash('merchant123', 10)
    merchant = await User.create({
      phone: merchantPhone,
      password: hashed,
      nickname: '测试商家',
      role: ROLES.MERCHANT,
      regionId: region._id,
      status: 'active',
      studentVerified: true,
    })
    const MerchantProfile = (await import('../models/MerchantProfile.js')).default
    const profile = await MerchantProfile.create({
      userId: merchant._id,
      regionId: region._id,
      shopName: '校园文具店',
      contactPhone: merchantPhone,
      address: '东区商业街 1 号',
      businessLicense: '91350000MA8XXXX',
      status: 'active',
    })
    merchant.merchantProfileId = profile._id
    await merchant.save()
    logger.info('✅ 创建测试商家:', merchantPhone, '/ merchant123')
  } else {
    merchant = await User.findOne({ phone: merchantPhone })
  }

  const studentPhone = '13800000003'
  let student = await User.findOne({ phone: studentPhone })
  if (!student) {
    const hashed = await bcrypt.hash('student123', 10)
    student = await User.create({
      phone: studentPhone,
      password: hashed,
      nickname: '测试学生',
      role: ROLES.STUDENT,
      regionId: region._id,
      status: 'active',
      studentVerified: true,
      studentInfo: { studentId: '2024001001', realName: '张三', enrollYear: 2024, college: '计算机学院' },
    })
    logger.info('✅ 创建测试学生:', studentPhone, '/ student123')
  } else {
    student = await User.findOne({ phone: studentPhone })
  }

  const Product = (await import('../models/Product.js')).default
  const { buildProductSearchText } = await import('../utils/productPinyin.js')
  const { imagesForProduct } = await import('../utils/demoProductImages.js')

  const missingSearchText = await Product.find({
    $or: [{ searchText: { $exists: false } }, { searchText: '' }],
  }).select('_id title')
  if (missingSearchText.length) {
    await Promise.all(
      missingSearchText.map((p) =>
        Product.updateOne({ _id: p._id }, { $set: { searchText: buildProductSearchText(p.title) } })
      )
    )
    logger.info(`✅ 回填商品拼音搜索字段 ${missingSearchText.length} 条`)
  }

  const productCount = await Product.countDocuments()
  if (productCount === 0 && merchant && student) {
    const samples = [
      {
        sellerId: student._id,
        regionId: region._id,
        sellerType: 'student',
        title: '高等数学同济第七版',
        description: '九成新，无笔记，适合大一复习',
        price: 25,
        originalPrice: 49,
        category: 'book',
        images: [],
        condition: 'like_new',
        status: 'on_sale',
        location: '东区宿舍',
      },
      {
        sellerId: student._id,
        regionId: region._id,
        sellerType: 'student',
        title: 'iPad 2021 64G',
        description: '自用两年，电池健康88%，含充电器',
        price: 1500,
        category: 'electronics',
        images: [],
        condition: 'good',
        status: 'on_sale',
        location: '西区宿舍',
      },
      {
        sellerId: merchant._id,
        regionId: region._id,
        sellerType: 'merchant',
        title: 'A4打印纸 500张/包',
        description: '校园文具店现货，可面交',
        price: 18,
        category: 'daily',
        images: [],
        condition: 'new',
        status: 'on_sale',
        location: '东区商业街',
      },
      {
        sellerId: merchant._id,
        regionId: region._id,
        sellerType: 'merchant',
        title: '中性笔套装 12支',
        description: '考试必备，多色可选',
        price: 12,
        category: 'daily',
        images: [],
        condition: 'new',
        status: 'on_sale',
        location: '东区商业街',
      },
    ]
    await Product.insertMany(
      samples.map((p) => ({
        ...p,
        images: imagesForProduct(p.title, p.title.includes('iPad') ? 2 : 1, p.category),
        searchText: buildProductSearchText(p.title),
      }))
    )
    logger.info('✅ 创建示例商品 4 条')
  }

  const { ensureDemoImageFiles, needsLocalImageMigration } = await import('../utils/demoProductImages.js')
  await ensureDemoImageFiles()
  const needImg = await Product.find({ regionId: region._id, deletedAt: null }).select('_id title category images')
  const toFix = needImg.filter((p) => needsLocalImageMigration(p.images))
  if (toFix.length) {
    await Promise.all(
      toFix.map((p) =>
        Product.updateOne(
          { _id: p._id },
          { $set: { images: imagesForProduct(p.title, p.images?.length || 1, p.category) } }
        )
      )
    )
    logger.info(`✅ 回填商品图片 ${toFix.length} 条`)
  }

  const { seedDefaultZonesForRegion } = await import('../services/deliveryZoneService.js')
  const zones = await seedDefaultZonesForRegion(region._id)
  if (zones.length) logger.info(`✅ 创建默认配送区域 ${zones.length} 个`)

  logger.info('\n📋 测试账号汇总:')
  logger.info('  超管:', superPhone, '/', config.superAdmin.password)
  logger.info('  代理: 13800000001 / agent123456')
  logger.info('  商家: 13800000002 / merchant123')
  logger.info('  学生: 13800000003 / student123（已认证）')
  logger.info('  学生: 也可自行注册（验证码', config.devSmsCode, '）')
  logger.info('  区域:', region.name, `(${region.code})`)

  await mongoose.disconnect()
  logger.info('\n🎉 初始化完成')
}

seed().catch((err) => {
  logger.error(err)
  process.exit(1)
})
