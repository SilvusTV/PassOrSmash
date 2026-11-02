import { request } from 'node:https'
import { resolvePublicHost } from './dns.js'
export { publicAddress } from './dns.js'
import { EditorialError } from './contracts.js'
/** Validate all DNS answers and pin each connection, including permitted redirect hops. */
export function createSafeDownloader(
  resolveHost = resolvePublicHost,
  send: typeof request = request
) {
  return async function download(
    rawUrl: string,
    options: {
      limit?: number
      timeout?: number
      method?: 'GET' | 'POST'
      body?: string
      headers?: Record<string, string>
      redirects?: number
    } = {}
  ): Promise<Buffer> {
    let url: URL
    try {
      url = new URL(rawUrl)
    } catch {
      throw new EditorialError('VALIDATION_FAILED', 'URL de téléchargement invalide.')
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443')
    )
      throw new EditorialError(
        'VALIDATION_FAILED',
        'URL HTTPS publique requise, sans identifiants ni port personnalisé.'
      )
    const addresses = await resolveHost(url.hostname)
    const target = addresses[0]
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          req.destroy(
            new EditorialError('PROVIDER_UNAVAILABLE', 'Délai de téléchargement dépassé.', true)
          ),
        options.timeout || 15000
      )
      const chunks: Buffer[] = []
      let size = 0
      const req = send(
        url,
        {
          method: options.method || 'GET',
          family: target.family,
          headers: {
            'accept-encoding': 'identity',
            'user-agent': 'PassOrSmash/1.0 (editorial image import)',
            ...options.headers,
          },
          lookup: (_hostname, _options, callback) => callback(null, target.address, target.family),
        },
        (response) => {
          if (
            [301, 302, 303, 307, 308].includes(response.statusCode || 0) &&
            response.headers.location &&
            (options.redirects || 0) > 0 &&
            (!options.method || options.method === 'GET')
          ) {
            clearTimeout(timer)
            response.resume()
            // Each hop gets a fresh public-address check and pinned connection.
            try {
              resolve(
                download(new URL(response.headers.location, url).href, {
                  limit: options.limit,
                  timeout: options.timeout,
                  redirects: options.redirects! - 1,
                })
              )
            } catch {
              reject(new EditorialError('VALIDATION_FAILED', 'Redirection d’image invalide.'))
            }
            return
          }
          if (response.statusCode !== 200) {
            response.resume()
            req.destroy(
              new EditorialError(
                'PROVIDER_UNAVAILABLE',
                `Téléchargement refusé (HTTP ${response.statusCode}). Utilisez une URL directe d’image.`,
                [408, 425, 429].includes(response.statusCode || 0) ||
                  (response.statusCode || 0) >= 500
              )
            )
            return
          }
          response.on('data', (chunk: Buffer) => {
            size += chunk.length
            if (size > (options.limit || 8 * 1024 * 1024))
              req.destroy(new EditorialError('VALIDATION_FAILED', 'Fichier trop volumineux.'))
            else chunks.push(chunk)
          })
          response.on('error', (error) => {
            clearTimeout(timer)
            reject(error)
          })
          response.on('aborted', () => {
            clearTimeout(timer)
            reject(new EditorialError('PROVIDER_UNAVAILABLE', 'Téléchargement interrompu.', true))
          })
          response.on('end', () => {
            clearTimeout(timer)
            resolve(Buffer.concat(chunks))
          })
        }
      )
      req.on('error', (error) => {
        clearTimeout(timer)
        reject(
          error instanceof EditorialError
            ? error
            : new EditorialError(
                'PROVIDER_UNAVAILABLE',
                'Connexion au serveur d’image impossible. Réessayez ou utilisez une autre URL.',
                true
              )
        )
      })
      req.end(options.body)
    })
  }
}

export const safeDownload = createSafeDownloader()
