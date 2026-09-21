import { copyFile, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { isGitLfsPointer, normalizeMediaRelativePath } from '../src/utils/pagesMedia.ts'

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

const [sourceRoot, destinationRoot] = process.argv.slice(2)

if (!sourceRoot || !destinationRoot) {
  throw new Error('Usage: node scripts/restore-pages-media.mjs <source-root> <destination-root>')
}

await rm(destinationRoot, { recursive: true, force: true })
await mkdir(destinationRoot, { recursive: true })

const sourceFiles = await collectFiles(sourceRoot)
let copied = 0
let skippedPointers = 0

for (const sourcePath of sourceFiles) {
  const payload = await readFile(sourcePath)
  if (isGitLfsPointer(payload)) {
    skippedPointers += 1
    continue
  }

  const mediaPath = normalizeMediaRelativePath(relative(sourceRoot, sourcePath))
  if (!mediaPath || mediaPath.startsWith('../')) {
    continue
  }

  const destinationPath = join(destinationRoot, mediaPath)
  await mkdir(dirname(destinationPath), { recursive: true })
  await copyFile(sourcePath, destinationPath)
  copied += 1
}

if (copied === 0) {
  throw new Error(`No real media payloads were restored from ${sourceRoot}; skipped ${skippedPointers} Git LFS pointers.`)
}

const destinationStats = await stat(destinationRoot)
console.log(`Restored ${copied} media payloads from nested Pages artifact data (${destinationStats.isDirectory() ? 'directory ready' : 'invalid destination'}); skipped ${skippedPointers} Git LFS pointers.`)
