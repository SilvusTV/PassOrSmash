import { test } from '@japa/runner'

test.group('Home', () => {
  test('legal pages identify the publisher, host, moderation access and privacy contact', async ({
    assert,
  }) => {
    for (const [path, expected] of [
      ['/mentions-legales', 'Hugo COMBE'],
      ['/cgu', 'publiques comme privées'],
      ['/confidentialite', 'responsable du traitement'],
    ]) {
      const response = await fetch(`http://localhost:3333${path}`)
      assert.equal(response.status, 200)
      const html = await response.text()
      assert.include(html, expected)
      assert.include(html, 'contact@passorsmash.fr')
      if (path === '/mentions-legales') assert.include(html, 'OVH')
    }
  })
  test('renders the public landing page', async ({ assert }) => {
    const response = await fetch('http://localhost:3333/')
    const html = await response.text()

    assert.equal(response.status, 200)
    assert.include(html, 'Pass or Smash')
    assert.include(html, 'data-server-rendered="true"')
    assert.include(html, 'https://passorsmash.fr/')
    assert.include(html, 'application/ld+json')
  })

  test('exposes SEO discovery files', async ({ assert }) => {
    const robots = await fetch('http://localhost:3333/robots.txt')
    const sitemap = await fetch('http://localhost:3333/sitemap.xml')

    assert.equal(robots.status, 200)
    assert.include(await robots.text(), '/sitemap.xml')
    assert.equal(sitemap.status, 200)
    assert.include(await sitemap.text(), '<urlset')
  })
})
