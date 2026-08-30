/** 获取微信登录 code */
export function getWxLoginCode() {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res) => {
        if (res.code) resolve(res.code)
        else reject(new Error('获取微信 code 失败'))
      },
      fail: (err) => reject(new Error(err.errMsg || '微信登录失败')),
    })
  })
}
