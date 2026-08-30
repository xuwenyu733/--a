/** 根据相对路径生成可访问的文件 URL（优先 OSS，否则 PUBLIC_BASE_URL / Host） */
export function getFileUrl(relativePath: string): string
