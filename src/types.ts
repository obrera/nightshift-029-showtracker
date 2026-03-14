export type WatchStatus = 'planned' | 'watching' | 'completed'

export interface ShowSummary {
  id: number
  name: string
  premiered: string | null
  ended: string | null
  status: string
  genres: string[]
  language: string | null
  rating: number | null
  network: string | null
  schedule: {
    time: string
    days: string[]
  }
  image: string | null
  summary: string | null
}

export interface SearchResult {
  score: number
  show: ShowSummary
}

export interface CastMember {
  person: {
    id: number
    name: string
    image?: {
      medium?: string
      original?: string
    } | null
  }
  character: {
    id: number
    name: string
  }
}

export interface Episode {
  id: number
  name: string
  season: number
  number: number | null
  airdate: string | null
  airtime: string | null
  runtime: number | null
}

export interface ShowDetail extends ShowSummary {
  officialSite: string | null
  runtime: number | null
  averageRuntime: number | null
  ended: string | null
  externals: {
    imdb?: string | null
  }
}

export interface WatchlistEntry {
  show: ShowSummary
  status: WatchStatus
  rating: number | null
  notes: string
  updatedAt: string
}
