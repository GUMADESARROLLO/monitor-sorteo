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

export interface LatestResponse {
  updatedAt: string
  draw: Draw | null
}
