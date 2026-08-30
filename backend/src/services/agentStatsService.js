import Product from '../models/Product.js'
import Order from '../models/Order.js'
import DeliveryOrder from '../models/DeliveryOrder.js'
import User from '../models/User.js'
import Report from '../models/Report.js'
import { DELIVERY_ORDER_STATUS } from '../constants/delivery.js'
import { buildPlatformCharts } from './platformChartService.js'

export async function getRegionStats(regionId) {
  const rid = regionId
  const [
    productTotal,
    productOnSale,
    userCount,
    studentCount,
    merchantCount,
    orderTotal,
    orderCompleted,
    revenueAgg,
    pendingReports,
    deliveryTotal,
    deliveryOpen,
    deliveryCompleted,
    courierCount,
  ] = await Promise.all([
    Product.countDocuments({ regionId: rid }),
    Product.countDocuments({ regionId: rid, status: 'on_sale' }),
    User.countDocuments({ regionId: rid, status: 'active' }),
    User.countDocuments({ regionId: rid, role: 'student', status: 'active' }),
    User.countDocuments({ regionId: rid, role: 'merchant', status: 'active' }),
    Order.countDocuments({ regionId: rid }),
    Order.countDocuments({ regionId: rid, status: 'completed' }),
    Order.aggregate([
      { $match: { regionId: rid, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]),
    Report.countDocuments({ regionId: rid, status: 'pending' }),
    DeliveryOrder.countDocuments({ regionId: rid }),
    DeliveryOrder.countDocuments({ regionId: rid, status: DELIVERY_ORDER_STATUS.OPEN }),
    DeliveryOrder.countDocuments({ regionId: rid, status: DELIVERY_ORDER_STATUS.COMPLETED }),
    User.countDocuments({ regionId: rid, courierVerified: true, status: 'active' }),
  ])

  const charts = await buildPlatformCharts({ regionId: rid })

  return {
    products: { total: productTotal, onSale: productOnSale },
    users: { total: userCount, students: studentCount, merchants: merchantCount },
    orders: { total: orderTotal, completed: orderCompleted },
    delivery: { total: deliveryTotal, open: deliveryOpen, completed: deliveryCompleted },
    couriers: courierCount,
    revenue: revenueAgg[0]?.total || 0,
    pendingReports,
    charts,
  }
}
