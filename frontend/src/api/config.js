import request from '@/utils/request'

export const getPlatformConfig = () => request.get('/config/platform')
export const updatePlatformConfig = (data) => request.put('/config/platform', data)
