import ResumeRecord from '../models/ResumeRecord.js'
import { paginationMeta } from '../utils/pagination.js'
import {
  deleteUploadedByDbPath,
  normalizeUploadDbPath,
} from './storageService.js'

export const MAX_PER_USER = 50

export async function listRecords(userId, { page = 1, pageSize = 20 } = {}) {
  const skip = (Number(page) - 1) * Number(pageSize)
  const filter = { userId }
  const [list, total] = await Promise.all([
    ResumeRecord.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(pageSize))
      .select('-originalContent -optimizedContent')
      .lean(),
    ResumeRecord.countDocuments(filter),
  ])
  return {
    list,
    pagination: paginationMeta(Number(page), Number(pageSize), total),
  }
}

export async function getRecord(id, userId) {
  const doc = await ResumeRecord.findOne({ _id: id, userId }).lean()
  if (!doc) {
    const err = new Error('记录不存在')
    err.code = 40400
    throw err
  }
  return doc
}

/** 若该证件照已无其他简历记录引用，则删除文件 */
async function cleanupOrphanPhoto(userId, photoUrl, exceptId = null) {
  const dbPath = normalizeUploadDbPath(photoUrl)
  if (!dbPath) return

  const filter = {
    userId,
    $or: [{ photoUrl: dbPath }, { photoUrl }, { 'builderData.photoUrl': dbPath }, { 'builderData.photoUrl': photoUrl }],
  }
  if (exceptId) {
    filter._id = { $ne: exceptId }
  }
  const stillUsed = await ResumeRecord.exists(filter)
  if (stillUsed) return

  await deleteUploadedByDbPath(dbPath)
}

export async function createRecord(userId, payload) {
  const count = await ResumeRecord.countDocuments({ userId })
  if (count >= MAX_PER_USER) {
    const oldest = await ResumeRecord.findOne({ userId }).sort({ updatedAt: 1 }).select('_id photoUrl')
    if (oldest) {
      await ResumeRecord.deleteOne({ _id: oldest._id })
      await cleanupOrphanPhoto(userId, oldest.photoUrl, oldest._id)
    }
  }
  return ResumeRecord.create({
    userId,
    fileName: payload.fileName || '未命名简历',
    originalContent: payload.originalContent || '',
    optimizedContent: payload.optimizedContent || '',
    suggestions: payload.suggestions || [],
    a4Metrics: payload.a4Metrics ?? null,
    jobDescription: payload.jobDescription || '',
    style: payload.style || 'professional',
    sourceType: payload.sourceType || 'upload',
    photoUrl: payload.photoUrl || '',
    builderData: payload.builderData ?? null,
  })
}

export async function updateRecord(id, userId, payload) {
  const prev = await ResumeRecord.findOne({ _id: id, userId }).select('photoUrl').lean()
  const doc = await ResumeRecord.findOneAndUpdate(
    { _id: id, userId },
    {
      $set: {
        fileName: payload.fileName,
        originalContent: payload.originalContent,
        optimizedContent: payload.optimizedContent,
        suggestions: payload.suggestions,
        a4Metrics: payload.a4Metrics,
        jobDescription: payload.jobDescription,
        style: payload.style,
        sourceType: payload.sourceType,
        photoUrl: payload.photoUrl,
        builderData: payload.builderData,
      },
    },
    { new: true }
  )
  if (!doc) {
    const err = new Error('记录不存在')
    err.code = 40400
    throw err
  }
  if (prev?.photoUrl && prev.photoUrl !== (payload.photoUrl || '')) {
    await cleanupOrphanPhoto(userId, prev.photoUrl, id)
  }
  return doc
}

export async function deleteRecord(id, userId) {
  const doc = await ResumeRecord.findOneAndDelete({ _id: id, userId })
  if (!doc) {
    const err = new Error('记录不存在')
    err.code = 40400
    throw err
  }
  await cleanupOrphanPhoto(userId, doc.photoUrl)
  return doc
}
