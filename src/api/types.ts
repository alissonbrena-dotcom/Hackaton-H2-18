// Tipos copiados del contrato público (Swagger) de la API.

export type WantedStatus = 'AT_LARGE' | 'CAPTURED' | 'MISSING'
export type FruitType = 'PARAMECIA' | 'ZOAN' | 'LOGIA'
export type FruitFilter = FruitType | 'NONE'
export type WantedSort = 'bounty,desc' | 'name,asc' | 'updatedAt,desc'
export type LogPoseStatus = 'LOCKED' | 'UNLOCKED'

export interface User {
  id: string
  name: string
  email: string
}

export interface Team {
  code: string
  name: string
}

export interface LoginResponse {
  token: string
  tokenType: 'Bearer'
  expiresAt: string
  user: User
  team: Team
}

export interface MeResponse {
  user: User
  team: Team
  expiresAt: string
}

export interface CrewRef {
  id: string
  name: string
}

export interface Crew {
  id: string
  name: string
  shipName: string
  jollyRogerColor: string
  memberCount: number
  totalBounty: number
}

export interface DevilFruit {
  name: string
  type: FruitType
}

export interface WantedSummary {
  id: string
  name: string
  epithet: string
  bounty: number
  status: WantedStatus
  crew: CrewRef
  role: string
  devilFruit: DevilFruit | null
  threatLevel: number
  lastSeenIsland: string
  updatedAt: string
}

export interface WantedDetail extends WantedSummary {
  age: number
  heightCm: number
  bio: string
  lastSeen: { island: string; seenAt: string }
  bountyHistory: { amount: number; issuedAt: string }[]
}

export interface WantedPage {
  content: WantedSummary[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

export interface DashboardSummary {
  team: Team
  wanted: {
    total: number
    totalBounty: number
    averageBounty: number
    byStatus: Record<WantedStatus, number>
    byFruit: Record<FruitFilter, number>
  }
  crews: { total: number; mostWanted: Crew | null }
  topBounties: WantedSummary[]
  generatedAt: string
}

export interface LogPose {
  status: LogPoseStatus
  grandLineUnlocked: boolean
  unlockedAt: string | null
  message: string
}

export type NewsType = 'BOUNTY_UPDATE' | 'BATTLE' | 'MARINE_OPERATION' | 'WORLD_GOVERNMENT' | 'DISCOVERY'
export type NewsPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type NewsStatus = 'RUMOR' | 'CONFIRMED' | 'DEBUNKED'
// Un rumor solo se puede verificar como CONFIRMED o DEBUNKED.
export type NewsVerification = Exclude<NewsStatus, 'RUMOR'>

export interface NewsItem {
  id: string
  type: NewsType
  priority: NewsPriority
  status: NewsStatus
  title: string
  summary: string
  source: string
  island: string
  relatedWanted: { id: string; name: string } | null
  publishedAt: string
  updatedAt: string
  verifiedAt: string | null
}

export interface NewsDetail extends NewsItem {
  body: string[]
}

export interface NewsFeed {
  items: NewsItem[]
  nextCursor: string | null
  hasMore: boolean
}

export interface Palette {
  background: string
  surface: string
  primary: string
  accent: string
  text: string
}

export interface SagaSummary {
  id: string
  order: number
  title: string
  subtitle: string
  synopsis: string
  stageCount: number
  totalDistanceNm: number
  firstIsland: string
  lastIsland: string
  palette: Palette
}

export type StageMetricKey = 'distanceNm' | 'crewMorale' | 'bountyPool' | 'marineThreat'

export interface StageMetric {
  key: StageMetricKey
  label: string
  value: number
  unit: string
}

export interface SagaStage {
  id: string
  order: number
  slug: string
  title: string
  narrative: string[]
  island: { id: string; name: string; x: number; y: number }
  palette: Palette
  metrics: StageMetric[]
}

export interface SagaStory {
  saga: SagaSummary & { intro: string }
  map: { width: number; height: number }
  stages: SagaStage[]
}

export interface ApiErrorBody {
  status: number
  code: string
  message: string
  traceId?: string
  details?: { field: string; message: string }[]
  // Solo en 409 NEWS_ALREADY_VERIFIED: la noticia tal como quedó.
  current?: NewsDetail
}
