export interface Bookmark {
  id: string
  user_id: string
  url: string
  title: string
  created_at: string
}

export interface User {
  id: string
  email?: string
  user_metadata?: {
    avatar_url?: string
    full_name?: string
  }
}
