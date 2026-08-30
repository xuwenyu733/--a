/** 未软删除的商品条件（合并到查询 filter） */
export function activeProductFilter(extra = {}) {
  return { ...extra, deletedAt: null }
}

export function isProductDeleted(product) {
  return product?.deletedAt != null
}
