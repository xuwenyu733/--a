/** 从用户对象构建设置页表单字段 */
export function profileFromUser(user) {
  return {
    nickname: user?.nickname || '',
    bio: user?.bio || '',
    email: user?.email || '',
    paymentQrUrl: user?.paymentQrUrl || '',
    avatar: user?.avatar || '',
  }
}

/** 设置页 updateProfile 请求体（去除空白昵称） */
export function profileToUpdatePayload(form) {
  return {
    nickname: form.nickname?.trim() || '',
    bio: form.bio || '',
    email: form.email || '',
    paymentQrUrl: form.paymentQrUrl || '',
    avatar: form.avatar || '',
  }
}
