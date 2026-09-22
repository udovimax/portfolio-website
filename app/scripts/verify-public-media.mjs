import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { isGitLfsPointer } from '../src/utils/pagesMedia.ts'

async function collectFiles(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(entryPath, files)
    } else if (entry.isFile()) {
      files.push(entryPath)
    }
  }

  return files
}

const [distRoot] = process.argv.slice(2)
if (!distRoot) {
  throw new Error('Usage: node scripts/verify-public-media.mjs <dist-root>')
}

const contentRoot = join(distRoot, 'content')
const videoContent = JSON.parse(await readFile(join(contentRoot, 'videos.json'), 'utf8'))
const archiveContent = JSON.parse(await readFile(join(contentRoot, 'archive.json'), 'utf8'))
const references = [
  ...videoContent.videos.map((video) => video.src),
  ...archiveContent.videos.flatMap((video) => [video.loop, video.src]),
]

for (const reference of references) {
  const relativeReference = reference.replace(/^\/+/, '')
  const mediaPath = join(distRoot, relativeReference)
  const payload = await readFile(mediaPath)
  const details = await stat(mediaPath)
  if (isGitLfsPointer(payload) || details.size <= 1024) {
    throw new Error(`Public media reference is not a real payload: ${reference}`)
  }
}

const videoFiles = (await collectFiles(join(distRoot, 'media'))).filter((pathValue) => /\.(mp4|webm|mov)$/i.test(pathValue))
if (videoFiles.length === 0) {
  throw new Error('No public video files were found in the Pages output.')
}

console.log(`Verified ${references.length} referenced videos and ${videoFiles.length} public video files.`)
