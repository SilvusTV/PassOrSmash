import { Head } from '@inertiajs/react'

const siteUrl = 'https://passorsmash.fr'
const defaultImage = `${siteUrl}/social-preview.svg`

type SeoProps = {
  title: string
  description: string
  path: string
  image?: string
  type?: 'website' | 'article'
  noIndex?: boolean
  structuredData?: Record<string, unknown>
}

export default function Seo({
  title,
  description,
  path,
  image = defaultImage,
  type = 'website',
  noIndex = false,
  structuredData,
}: SeoProps) {
  const canonical = new URL(path, siteUrl).toString()
  const fullTitle = title === 'Pass or Smash' ? title : `${title} | Pass or Smash`

  return (
    <Head title={title}>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta
        name="robots"
        content={noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}
      />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:image:alt" content={title} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {structuredData && (
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      )}
    </Head>
  )
}
