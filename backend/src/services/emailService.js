import nodemailer from 'nodemailer'
import logger from '../utils/logger.js'

let transporter = null

function getTransporter() {
  if (transporter !== null) return transporter
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  if (!host || !user || !pass) {
    transporter = false
    return transporter
  }
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== 'false',
    auth: { user, pass },
  })
  return transporter
}

export function isEmailEnabled() {
  return !!getTransporter()
}

/**
 * @param {{ to: string, subject: string, text: string, html?: string }} opts
 */
export async function sendMail(opts) {
  const tx = getTransporter()
  if (!tx) return false
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER
  try {
    await tx.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html || opts.text.replace(/\n/g, '<br>'),
    })
    return true
  } catch (err) {
    logger.warn(`邮件发送失败: ${err.message}`)
    return false
  }
}

/** 站内通知的邮件副本（用户未在线时补发） */
export async function sendNotificationEmail(user, { title, content }) {
  const email = user?.email?.trim()
  if (!email) return false
  return sendMail({
    to: email,
    subject: `[校园市集] ${title}`,
    text: `${title}\n\n${content || ''}\n\n— 校园市集`,
  })
}
