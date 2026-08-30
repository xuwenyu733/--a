import { request } from '@/utils/request'

export const getPlatformConfig = () => request({ url: '/config/platform' })
