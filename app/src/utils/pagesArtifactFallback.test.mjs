import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const repositoryRoot = resolve(appRoot, '..')
const restoreScript = join(appRoot, 'scripts/restore-pages-media.mjs')
const workflowPath = join(repositoryRoot, '.github/workflows/github-pages.yml')

test('Pages deployment falls back to the retained gh-pages media snapshot when its artifact is unavailable', async () => {
  const workflow = await readFile(workflowPath, 'utf8')

  assert.match(workflow, /core\.setOutput\(['"]media_source['"],\s*['"]gh-pages['"]\)/)
  assert.match(workflow, /name:\s*Checkout retained Pages media snapshot/)
  assert.match(workflow, /name:\s*Restore optimized media from retained Pages snapshot/)
  assert.match(workflow, /steps\.find-pages-artifact\.outputs\.media_source\s*==\s*['"]gh-pages['"]|steps\.find-pages-artifact\.outputs\.media_source\s*==\s*'gh-pages'/)
})

test('media restoration overlays the retained snapshot without deleting real media from the current build', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'max-pages-media-'))
  const sourceRoot = join(tempRoot, 'snapshot', 'media')
  const destinationRoot = join(tempRoot, 'dist', 'media')

  try {
    await mkdir(join(sourceRoot, 'video'), { recursive: true })
    await mkdir(join(destinationRoot, 'images'), { recursive: true })
    await mkdir(join(destinationRoot, 'video'), { recursive: true })
    await writeFile(join(sourceRoot, 'video', 'reel.mp4'), Buffer.from('real media from deployed snapshot'))
    await writeFile(join(destinationRoot, 'images', 'new-current-image.webp'), Buffer.from('real media from current build'))
    await writeFile(
      join(destinationRoot, 'video', 'reel.mp4'),
      [
        'version https://git-lfs.github.com/spec/v1',
        `oid sha256:${'a'.repeat(64)}`,
        'size 42',
        '',
      ].join('\n'),
    )
    await writeFile(
      join(destinationRoot, 'video', 'unavailable.mp4'),
      [
        'version https://git-lfs.github.com/spec/v1',
        `oid sha256:${'b'.repeat(64)}`,
        'size 99',
        '',
      ].join('\n'),
    )

    const result = spawnSync(process.execPath, [restoreScript, sourceRoot, destinationRoot], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.deepEqual(await readFile(join(destinationRoot, 'images', 'new-current-image.webp')), Buffer.from('real media from current build'))
    assert.deepEqual(await readFile(join(destinationRoot, 'video', 'reel.mp4')), Buffer.from('real media from deployed snapshot'))
    await assert.rejects(readFile(join(destinationRoot, 'video', 'unavailable.mp4')), { code: 'ENOENT' })
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
})
