function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function clientMessage(err, fallback = '服务器错误') {
  const msg = err?.message || fallback
  if (isProduction()) {
    if (/OPENAI_API_KEY|API 配置|api key/i.test(msg)) return msg
    return fallback
  }
  return msg
}

module.exports = { clientMessage, isProduction };