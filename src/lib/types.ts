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

/** ok = parsed · not-published = the site has no PDF for the draw yet · failed = PDF exists but couldn't be downloaded/parsed */
export type WinnerListStatus = 'ok' | 'not-published' | 'failed'

export interface WinnerListsResult {
  lists: OfficialList[]
  status: Record<number, WinnerListStatus>
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
  /** TOTAL_FACTURA from Softland.umk.FACTURA, in córdobas */
  montoFactura: number | null
  /** Invoices of this client that earned raffle numbers during the promotion */
  facturasCliente: number
  /** Sum of those invoices' TOTAL_FACTURA, in córdobas */
  montoCliente: number
  /** Raffle numbers (acciones) the client accumulated */
  accionesCliente: number
}

export interface RifaResult {
  checkedAt: string
  matches: RifaMatch[]
  error?: string
}

export interface RefreshResponse extends DrawsResponse {
  winners: OfficialList[]
  winnersStatus: Record<number, WinnerListStatus>
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
