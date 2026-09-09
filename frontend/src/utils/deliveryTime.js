export {
  buildDeliveryTimeOptions,
  buildHallDeliveryTimeFilterOptions,
  formatDeliveryTimeLabel,
  formatActualDeliveryLabel,
  DELIVERY_TIME_TYPE,
} from '../../../shared/deliveryTimeCore.js'

export function deliveryTimePayloadFromOption(option) {
  if (!option) return null
  return {
    deliveryTimeType: option.type,
    deliveryDeadlineStart: option.deadlineStart.toISOString(),
    deliveryDeadlineEnd: option.deadlineEnd.toISOString(),
  }
}

export function hallTimeFilterParams(option) {
  if (!option?.deadlineStart || !option?.deadlineEnd) return {}
  return {
    deliveryDeadlineStart: option.deadlineStart.toISOString(),
    deliveryDeadlineEnd: option.deadlineEnd.toISOString(),
  }
}
