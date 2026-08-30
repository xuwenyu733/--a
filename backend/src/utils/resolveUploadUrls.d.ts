/** 深度遍历响应数据，将 /uploads/ 相对路径转为可访问 URL */
export function resolveUploadUrls(value: unknown, seen?: WeakSet<object>): unknown
