export type Source = { title: string; url: string; published_at?: string; retrieved_at: string }
export type Item = {
  id?: string
  title: string
  description: string
  media_id?: string
  source_urls: string[]
}
export type Content = {
  title: string
  description: string
  category: string
  items: Item[]
  sources: Source[]
  checks: string[]
}
export type Proposal = {
  id: string
  status: string
  revision: number
  content: Content
  created_at: string
}
export type Settings = {
  enabled: boolean
  timezone: 'Europe/Paris'
  slots: { weekday: number; hour: number; minute: number }[]
  categories: string[]
  sources: { title: string; url: string; category: string }[]
  freshness_days: number
  catchup_hours: number
  item_count: number
  daily_job_limit: number
  daily_budget_cents: number
  generation_call_cost_cents: number
  automation_user_id?: number
  notification_label: string
}
