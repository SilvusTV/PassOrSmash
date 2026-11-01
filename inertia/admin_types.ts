export type Pagination = { total: number; page: number; lastPage: number; pageSize: number }
export type Account = {
  id: number
  fullName: string | null
  username: string | null
  email: string
  discordId: string | null
  createdAt: string
  suspendedAt: string | null
  isAdmin: boolean
  playlistCount: number
  publicCount: number
  privateCount: number
  voteCount: number
}
export type PlaylistSummary = {
  id: number
  title: string
  slug: string
  description: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string | null
  userId: number
  ownerName: string
  itemCount: number
  voteCount: number
}
export type AdminItem = {
  id?: number
  title: string
  description: string
  image_url: string
  smashes: number
  passes: number
}
export const adminDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('fr-FR', {
        timeZone: 'Europe/Paris',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—'
export const accountName = (value: Account) => value.fullName || value.username || value.email
