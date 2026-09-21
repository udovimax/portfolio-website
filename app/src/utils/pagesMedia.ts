export const GIT_LFS_POINTER_HEADER = 'version https://git-lfs.github.com/spec/v1'

export function isGitLfsPointer(value: string | Uint8Array) {
  const text = typeof value === 'string'
    ? value
    : new TextDecoder().decode(value.subarray(0, 256))

  return text.startsWith(`${GIT_LFS_POINTER_HEADER}\n`)
}

export function normalizeMediaRelativePath(pathValue: string) {
  let normalized = pathValue.replaceAll('\\', '/').replace(/^\/+/, '')

  while (normalized.startsWith('media/')) {
    normalized = normalized.slice('media/'.length)
  }

  return normalized
}
