export {
  buildDeliveryTimeOptions,
  buildHallDeliveryTimeFilterOptions,
  formatDeliveryTimeLabel,
  formatActualDeliveryLabel,
  isAsapAvailable,
  DELIVERY_TIME_TYPE,
} from '../../shared/deliveryTimeCore.js'

/** 将 picker 选中的时段转为 API 提交字段 */
export function deliveryTimePayloadFromOption(option) {
  if (!option) return null
  return {
    deliveryTimeType: option.type,
    deliveryDeadlineStart: option.deadlineStart.toISOString(),
    deliveryDeadlineEnd: option.deadlineEnd.toISOString(),
  }
}

/** 大厅时段筛选 query 参数 */
export function hallTimeFilterParams(option) {
  if (!option?.deadlineStart || !option?.deadlineEnd) return {}
  return {
    deliveryDeadlineStart: option.deadlineStart.toISOString(),
    deliveryDeadlineEnd: option.deadlineEnd.toISOString(),
  }
}
