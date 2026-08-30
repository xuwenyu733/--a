export function isMiniProgramClient(req: {
  headers: Record<string, string | string[] | undefined>
  body?: { clientType?: string }
}): boolean
