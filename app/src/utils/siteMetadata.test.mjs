import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
const sitemap = readFileSync(new URL('../../public/sitemap.xml', import.meta.url), 'utf8')
const robots = readFileSync(new URL('../../public/robots.txt', import.meta.url), 'utf8')
const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
const siteUrl = 'https://maxudovichenko.art/'
const positioning = 'Original music and sound for film, games and creative projects.'
const siteTitle = 'Max Udovichenko | Music and Sound for Film, Games and Creative Projects'
const siteDescription = `${positioning} Max composes and produces music and designs sound while studying Music Technology at Kingston University London.`

function metaValue(attribute, value) {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*\\b${attribute}="${escapedValue}")[^>]*>`))?.[0]
  return tag?.match(/\bcontent="([^"]*)"/)?.[1]
}

function readStructuredData() {
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
  assert.ok(json, 'the document includes JSON-LD structured data')
  return JSON.parse(json)
}

test('the standard test command includes the portfolio contract suites', () => {
  assert.match(packageJson.scripts.test, /src\/\*\*\/\*\.test\.ts/)
  assert.match(packageJson.scripts.test, /src\/\*\*\/\*\.test\.mjs/)
})

test('document title and description match Max’s verified positioning', () => {
  assert.match(html, new RegExp(`<title>${siteTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/title>`))
  assert.equal(metaValue('name', 'description'), siteDescription)
  assert.equal(metaValue('property', 'og:description'), siteDescription)
  assert.equal(metaValue('name', 'twitter:description'), siteDescription)
})

test('canonical and social previews use the production domain', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/maxudovichenko\.art\/"\s*\/>/)
  assert.equal(metaValue('property', 'og:url'), siteUrl)
  assert.equal(metaValue('property', 'og:title'), siteTitle)
  assert.equal(metaValue('name', 'twitter:title'), siteTitle)
  assert.match(metaValue('property', 'og:image'), /^https:\/\/maxudovichenko\.art\//)
  assert.match(metaValue('name', 'twitter:image'), /^https:\/\/maxudovichenko\.art\//)
})

test('structured identity and crawler files use one individual root URL', () => {
  const person = readStructuredData()
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, location]) => location)

  assert.equal(person['@context'], 'https://schema.org')
  assert.equal(person['@type'], 'Person')
  assert.equal(person.name, 'Max Udovichenko')
  assert.equal(person.url, siteUrl)
  assert.equal('genre' in person, false)
  assert.deepEqual(person.sameAs, [
    'https://open.spotify.com/artist/77TKxBbDOLGzmuYKcpPub8',
    'https://www.instagram.com/udaaaww/',
    'https://www.linkedin.com/in/max-udovichenko-27589a426',
    'https://www.bandlab.com/max_udovichenko',
    'https://soundcloud.com/sijanieee',
  ])
  assert.deepEqual(locations, [siteUrl])
  assert.match(robots, new RegExp(`^Sitemap: ${siteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}sitemap\\.xml$`, 'm'))
})
