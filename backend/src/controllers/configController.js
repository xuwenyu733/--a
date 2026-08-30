import SystemConfig from '../models/SystemConfig.js'
import { getPublicConfig, updatePlatformConfig } from '../services/configService.js'
import { success } from '../utils/response.js'

export async function getPlatformConfig(req, res, next) {
  try {
    const config = await getPublicConfig(SystemConfig)
    return success(res, config)
  } catch (err) {
    next(err)
  }
}

export async function updatePlatformConfigHandler(req, res, next) {
  try {
    const doc = await updatePlatformConfig(SystemConfig, req.body)
    return success(res, doc.value, '配置已更新')
  } catch (err) {
    next(err)
  }
}
