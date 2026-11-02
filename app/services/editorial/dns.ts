import { lookup, Resolver } from 'node:dns/promises'
import { isIP } from 'node:net'
import ipaddr from 'ipaddr.js'
import { EditorialError } from './contracts.js'

export function publicAddress(address: string) {
  try {
    return ipaddr.process(address).range() === 'unicast'
  } catch {
    return false
  }
}

type Address = { address: string; family: number }
// c-ares avoids the OS lookup thread pool, which can stall under concurrent imports.
const resolver = new Resolver({ timeout: 1500, tries: 2 })
export function createPublicResolver(
  resolve = async (host: string): Promise<Address[]> => {
    const results = await Promise.allSettled([resolver.resolve4(host), resolver.resolve6(host)])
    const addresses = results.flatMap((result, index) =>
      result.status === 'fulfilled'
        ? result.value.map((address) => ({ address, family: index === 0 ? 4 : 6 }))
        : []
    )
    // Some private DNS environments only support the OS resolver.
    return addresses.length ? addresses : lookup(host, { all: true })
  },
  timeout = 8000
) {
  const cache = new Map<string, { addresses: Address[]; expires: number }>()
  const pending = new Map<string, Promise<Address[]>>()
  return async (hostname: string): Promise<Address[]> => {
    const host = hostname.replace(/^\[|\]$/g, '').toLowerCase()
    const cached = cache.get(host)
    if (cached && cached.expires > Date.now()) return cached.addresses
    if (pending.has(host)) return pending.get(host)!
    const operation = (async () => {
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        const addresses = await Promise.race([
          isIP(host) ? Promise.resolve([{ address: host, family: isIP(host) }]) : resolve(host),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('DNS timeout')), timeout)
          }),
        ])
        if (!addresses.length || addresses.some(({ address }) => !publicAddress(address)))
          throw new EditorialError('VALIDATION_FAILED', 'Adresse réseau interdite.')
        // Prefer IPv4 on hosts without a working IPv6 route.
        addresses.sort((a, b) => a.family - b.family)
        if (cache.size >= 256) cache.delete(cache.keys().next().value!)
        cache.set(host, { addresses, expires: Date.now() + 60000 })
        return addresses
      } catch (error) {
        if (error instanceof EditorialError) throw error
        throw new EditorialError(
          'PROVIDER_UNAVAILABLE',
          `Impossible de résoudre ${host}. Réessayez ou choisissez une autre URL d’image.`,
          true
        )
      } finally {
        clearTimeout(timer)
      }
    })()
    pending.set(host, operation)
    try {
      return await operation
    } finally {
      pending.delete(host)
    }
  }
}

export const resolvePublicHost = createPublicResolver()
