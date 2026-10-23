import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const readContent = (fileName) => JSON.parse(readFileSync(new URL(`../../public/content/${fileName}`, import.meta.url), 'utf8'))
const readSource = (fileName) => readFileSync(new URL(`../${fileName}`, import.meta.url), 'utf8')

test('the homepage intro sells services and guides visitors to work or contact', () => {
  const about = readContent('about.json')

  assert.equal(about.headline, 'Original music and sound for film, games and creative projects.')
  assert.match(about.intro, /compose original music/i)
  assert.match(about.intro, /produce recordings/i)
  assert.match(about.intro, /design sound for film, games, and creative projects/i)
  assert.match(about.intro, /explore selected work or get in touch to discuss a session or brief/i)
  assert.doesNotMatch(about.intro, /student|Kingston University London/i)

  const education = about.timeline.find(({ title }) => title === 'Kingston University London')
  assert.ok(education, 'education remains available in the About timeline')
  assert.match(education.description, /BA \(Hons\) Music Technology/i)
})

test('the featured 5.1 work retains its checked-in identity and production credit', () => {
  const music = readContent('music.json')
  const featuredTrack = music.tracks.find(({ id }) => id === 'track-51')

  assert.ok(featuredTrack, 'the existing track-51 entry remains available')
  assert.equal(featuredTrack.title, '5.1 Surround Composition')
  assert.equal(featuredTrack.year, 2026)
  assert.equal(featuredTrack.credits, 'Composition, production, and multichannel mix by Max Udovichenko')
})

test('the archive explains its numbered clips once and preserves their identities', () => {
  const archive = readContent('archive.json')
  const archiveIds = archive.videos.map(({ id }) => id)

  assert.equal(archive.videoIntro, 'Short moving fragments from Max’s music archive.')
  assert.equal(archive.videos.length, 17)
  assert.equal(new Set(archiveIds).size, archiveIds.length)
  assert.deepEqual(
    archive.videos.map(({ title }) => title),
    Array.from({ length: 17 }, (_, index) => `Highlight study ${String(index + 1).padStart(2, '0')}`),
  )
})

test('archive cards show each duration once without repeating generic filler', () => {
  const mediaArchive = readSource('components/MediaArchive.tsx')

  assert.equal(mediaArchive.match(/video\.duration/g)?.length, 1)
  assert.doesNotMatch(mediaArchive, /Short moving fragment/)
})

test('every project video association resolves to a named project video', () => {
  const projects = readContent('projects.json')
  const videos = readContent('videos.json')
  const videoIds = new Set(videos.videos.map(({ id }) => id))

  for (const project of projects.projects) {
    assert.ok(project.videoId, `${project.title} has a linked video`)
    assert.ok(videoIds.has(project.videoId), `${project.title} resolves to ${project.videoId}`)
  }
})

test('about preserves current study and labels graduation as an expected target', () => {
  const about = readContent('about.json')
  const education = about.timeline.find(({ title }) => title === 'Kingston University London')
  const graduation = about.timeline.find(({ year }) => year === '2027')

  assert.ok(education, 'the education milestone remains in the timeline')
  assert.ok(graduation, 'the future graduation milestone remains in the timeline')
  assert.equal(graduation.title, 'Graduation Target')
  assert.match(graduation.description, /Expected completion/i)
})
