let publicBaseUrl = ''

/** @param {string} [url] */
export function setPublicBaseUrl(url) {
  publicBaseUrl = (url || '').replace(/\/$/, '')
}

export function getPublicBaseUrl() {
  return publicBaseUrl
}
