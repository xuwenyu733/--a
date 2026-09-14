import Product from '../models/Product.js'
import Order from '../models/Order.js'
import MerchantProfile from '../models/MerchantProfile.js'
import { activeProductFilter } from '../utils/productQuery.js'

const CATEGORY_LABELS = {
  book: '书籍教材',
  electronics: '电子产品',
  daily: '生活用品',
  clothing: '服饰鞋包',
  other: '其他',
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

export async function getMerchantStats(userId) {
  const shop = await MerchantProfile.findOne({ userId })
  const sellerFilter = { sellerId: userId }
  const dayRanges = last7DayRanges()
  const weekStart = dayRanges[0].start

  const [
    productTotal,
    productOnSale,
    orderPending,
    orderConfirmed,
    orderCompleted,
    orderCancelled,
    revenueAgg,
    recentOrders,
    weekCompletedOrders,
    categoryAgg,
  ] = await Promise.all([
    Product.countDocuments(activeProductFilter({ sellerId: userId })),
    Product.countDocuments(activeProductFilter({ sellerId: userId, status: 'on_sale' })),
    Order.countDocuments({ ...sellerFilter, status: 'pending' }),
    Order.countDocuments({ ...sellerFilter, status: 'confirmed' }),
    Order.countDocuments({ ...sellerFilter, status: 'completed' }),
    Order.countDocuments({ ...sellerFilter, status: 'cancelled' }),
    Order.aggregate([
      { $match: { ...sellerFilter, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } },
    ]),
    Order.find(sellerFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('productId', 'title images')
      .populate('buyerId', 'nickname'),
    Order.find({
      ...sellerFilter,
      status: 'completed',
      completedAt: { $gte: weekStart },
    })
      .select('completedAt price')
      .lean(),
    Product.aggregate([
      {
        $match: activeProductFilter({ sellerId: userId, status: 'on_sale' }),
      },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ])

  const revenue = revenueAgg[0]?.total || 0

  const ordersTrend = dayRanges.map(({ start, end, label }) => {
    const dayOrders = weekCompletedOrders.filter((o) => {
      const t = new Date(o.completedAt)
      return t >= start && t <= end
    })
    return {
      date: label,
      count: dayOrders.length,
      amount: dayOrders.reduce((s, o) => s + (o.price || 0), 0),
    }
  })

  const categoryBreakdown = categoryAgg.map((c) => ({
    category: c._id,
    label: CATEGORY_LABELS[c._id] || c._id,
    count: c.count,
  }))

  const orderStatusPie = [
    { name: '待确认', value: orderPending },
    { name: '待付款', value: orderConfirmed },
    { name: '已完成', value: orderCompleted },
    { name: '已取消', value: orderCancelled },
  ].filter((x) => x.value > 0)

  return {
    shop: shop
      ? {
          shopName: shop.shopName,
          stats: shop.stats,
        }
      : null,
    products: { total: productTotal, onSale: productOnSale },
    orders: {
      pending: orderPending,
      confirmed: orderConfirmed,
      completed: orderCompleted,
      cancelled: orderCancelled,
    },
    revenue,
    recentOrders,
    charts: {
      ordersTrend,
      categoryBreakdown,
      orderStatusPie,
    },
  }
}
