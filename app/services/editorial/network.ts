import { lookup } from 'node:dns/promises'
import { request } from 'node:https'
import ipaddr from 'ipaddr.js'
import { EditorialError } from './contracts.js'

export function publicAddress(address: string) {
  try {
    return ipaddr.process(address).range() === 'unicast'
  } catch {
    return false
  }
}

/** Resolve once, validate every address and pin the socket to that resolution. No redirects. */
export async function safeDownload(
  rawUrl: string,
  options: {
    limit?: number
    timeout?: number
    method?: 'GET' | 'POST'
    body?: string
    headers?: Record<string, string>
  } = {}
): Promise<Buffer> {
  const url = new URL(rawUrl)
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443'))
    throw new EditorialError(
      'VALIDATION_FAILED',
      'URL HTTPS publique requise, sans identifiants ni port personnalisé.'
    )
  let dnsTimer: ReturnType<typeof setTimeout> | undefined
  const addresses = await Promise.race([
    lookup(url.hostname, { all: true }),
    new Promise<never>((_resolve, reject) => {
      dnsTimer = setTimeout(
        () =>
          reject(new EditorialError('PROVIDER_UNAVAILABLE', 'Résolution DNS trop lente.', true)),
        5000
      )
    }),
  ]).finally(() => clearTimeout(dnsTimer))
  if (!addresses.length || addresses.some(({ address }) => !publicAddress(address)))
    throw new EditorialError('VALIDATION_FAILED', 'Adresse réseau interdite.')
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
    const req = request(
      url,
      {
        method: options.method || 'GET',
        family: target.family,
        headers: { 'accept-encoding': 'identity', ...options.headers },
        lookup: (_hostname, _options, callback) => callback(null, target.address, target.family),
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume()
          req.destroy(
            new EditorialError(
              'PROVIDER_UNAVAILABLE',
              'Réponse fournisseur refusée (redirections interdites).',
              true
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
        response.on('error', reject)
        response.on('end', () => {
          clearTimeout(timer)
          resolve(Buffer.concat(chunks))
        })
      }
    )
    req.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    req.end(options.body)
  })
}
