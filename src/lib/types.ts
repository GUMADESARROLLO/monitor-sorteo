export interface Draw {
  drawNumber: number
  winnerNumber: string
  prize: string
  date: string
}

export interface DrawsResponse {
  updatedAt: string
  draws: Draw[]
}

export interface RifaMatch {
  drawNumber: number
  number: string
  prize: string
  category: string
  cliente: string
  nombre: string | null
  direccion: string | null
  factura: string | null
}

export interface RifaResult {
  checkedAt: string
  matches: RifaMatch[]
  error?: string
}

export interface RefreshResponse extends DrawsResponse {
  winners: OfficialList[]
  rifa: RifaResult
}

export interface OfficialListRef {
  drawNumber: number
  url: string
  uploadedAt: string
}

export interface MainPrize {
  place: number // 1 = Premio Mayor
  number: string
  prize: string
  branch: string | null
}

export interface PrizeEntry {
  number: string
  prize: string
}

export interface OfficialList {
  drawNumber: number
  url: string
  mainPrizes: MainPrize[]
  approximations: PrizeEntry[]
  otherPrizes: PrizeEntry[]
}

export interface LatestResponse {
  updatedAt: string
  draw: Draw | null
}
