import mongoose from 'mongoose'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import DeliveryOrder from '../models/DeliveryOrder.js'
import User from '../models/User.js'
import Region from '../models/Region.js'
import { DELIVERY_ORDER_STATUS, DELIVERY_ORDER_STATUS_LABELS } from '../constants/delivery.js'
import { activeProductFilter } from '../utils/productQuery.js'

const CATEGORY_LABELS = {
  book: '书籍教材',
  electronics: '电子产品',
  daily: '生活用品',
  clothing: '服饰鞋包',
  other: '其他',
}

const ROLE_LABELS = {
  student: '学生',
  merchant: '商家',
  regional_agent: '区域代理',
  super_admin: '超管',
  courier: '骑手',
}

function last7DayRanges() {
  const ranges = []
  const now = new Date()
  for (let i = 6; i >= 0; i -= 1) {
    const start = new Date(now)
    start.setDate(start.getDate() - i)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setHours(23, 59, 59, 999)
    const label = `${start.getMonth() + 1}/${start.getDate()}`
    ranges.push({ start, end, label })
  }
  return ranges
}

function toObjectId(id) {
  if (!id) return null
  return id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)
}

/**
 * @param {{ regionId?: import('mongoose').Types.ObjectId | string }} opts
 */
export async function buildPlatformCharts(opts = {}) {
  const regionId = opts.regionId ? toObjectId(opts.regionId) : null
  const productMatch = regionId ? { regionId } : {}
  const orderMatch = regionId ? { regionId } : {}
  const deliveryMatch = regionId ? { regionId } : {}
  const userMatch = regionId ? { regionId, status: 'active' } : { status: 'active' }

  const dayRanges = last7DayRanges()
  const weekStart = dayRanges[0].start

  const [
    weekCompletedOrders,
    weekCompletedDelivery,
    categoryAgg,
    roleAgg,
    orderStatusAgg,
    deliveryStatusAgg,
    regionRevenueAgg,
  ] = await Promise.all([
    Order.find({ ...orderMatch, status: 'completed', completedAt: { $gte: weekStart } })
      .select('completedAt price')
      .lean(),
    DeliveryOrder.find({
      ...deliveryMatch,
      status: DELIVERY_ORDER_STATUS.COMPLETED,
      completedAt: { $gte: weekStart },
    })
      .select('completedAt fee')
      .lean(),
    Product.aggregate([
      { $match: activeProductFilter({ ...productMatch, status: 'on_sale' }) },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    User.aggregate([{ $match: userMatch }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: orderMatch }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    DeliveryOrder.aggregate([{ $match: deliveryMatch }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    regionId
      ? Promise.resolve([])
      : Order.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: '$regionId', amount: { $sum: '$price' }, count: { $sum: 1 } } },
          { $sort: { amount: -1 } },
          { $limit: 8 },
        ]),
  ])

  const ordersTrend = dayRanges.map(({ start, end, label }) => {
    const dayOrders = weekCompletedOrders.filter((o) => {
      const t = new Date(o.completedAt)
      return t >= start && t <= end
    })
    const dayDelivery = weekCompletedDelivery.filter((o) => {
      const t = new Date(o.completedAt)
      return t >= start && t <= end
    })
    return {
      date: label,
      orderCount: dayOrders.length,
      orderAmount: dayOrders.reduce((s, o) => s + (o.price || 0), 0),
      deliveryCount: dayDelivery.length,
      deliveryAmount: dayDelivery.reduce((s, o) => s + (o.fee || 0), 0),
    }
  })

  const categoryBreakdown = categoryAgg.map((c) => ({
    category: c._id,
    label: CATEGORY_LABELS[c._id] || c._id || '未分类',
    count: c.count,
  }))

  const ORDER_STATUS_LABELS = {
    pending: '待确认',
    confirmed: '待付款',
    completed: '已完成',
    cancelled: '已取消',
  }
  const orderStatusPie = orderStatusAgg
    .map((s) => ({
      name: ORDER_STATUS_LABELS[s._id] || s._id,
      value: s.count,
    }))
    .filter((x) => x.value > 0)

  const deliveryStatusPie = deliveryStatusAgg
    .map((s) => ({
      name: DELIVERY_ORDER_STATUS_LABELS[s._id] || s._id,
      value: s.count,
    }))
    .filter((x) => x.value > 0)

  const userRolePie = roleAgg
    .map((r) => ({
      name: ROLE_LABELS[r._id] || r._id,
      value: r.count,
    }))
    .filter((x) => x.value > 0)

  let regionRevenue = []
  if (!regionId && regionRevenueAgg.length) {
    const regionIds = regionRevenueAgg.map((r) => r._id).filter(Boolean)
    const regions = await Region.find({ _id: { $in: regionIds } }).select('name').lean()
    const nameMap = Object.fromEntries(regions.map((r) => [r._id.toString(), r.name]))
    regionRevenue = regionRevenueAgg.map((r) => ({
      regionId: r._id,
      name: r._id ? nameMap[r._id.toString()] || '未知区域' : '未分区',
      amount: r.amount,
      count: r.count,
    }))
  }

  return {
    ordersTrend,
    categoryBreakdown,
    orderStatusPie,
    deliveryStatusPie,
    userRolePie,
    regionRevenue,
  }
}
