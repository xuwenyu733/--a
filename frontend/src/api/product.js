import request from '@/utils/request'

export const getProductMeta = () => request.get('/products/meta')
export const getProducts = (params) => request.get('/products', { params })
export const getRecommendedProducts = (params) => request.get('/products/recommended', { params })
export const getProductDetail = (id) => request.get(`/products/${id}`)
export const createProduct = (data) => request.post('/products', data)
export const updateProduct = (id, data) => request.put(`/products/${id}`, data)
export const deleteProduct = (id) => request.delete(`/products/${id}`)
export const updateProductStatus = (id, status) => request.patch(`/products/${id}/status`, { status })
export const getMyProducts = (params) => request.get('/products/mine', { params })
export const toggleFavorite = (id) => request.post(`/products/${id}/favorite`)
export const getFavorites = (params) => request.get('/products/favorites', { params })

export function uploadImages(files) {
  const form = new FormData()
  files.forEach((f) => form.append('images', f))
  return request.post('/products/upload', form)
}

export function uploadVideo(file) {
  const form = new FormData()
  form.append('video', file)
  return request.post('/products/upload-video', form)
}
