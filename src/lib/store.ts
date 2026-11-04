import type { Draw, OfficialList, RifaResult, WinnerListStatus, WinnerListsResult } from './types'

class DrawStore {
  private draws: Draw[] = []
  private winners: OfficialList[] = []
  private winnersStatus: Record<number, WinnerListStatus> = {}
  private rifa: RifaResult | null = null
  private lastUpdated: Date | null = null

  getDraws(): Draw[] {
    return [...this.draws]
  }

  getUpdatedAt(): string | null {
    return this.lastUpdated?.toISOString() ?? null
  }

  getLatest(): Draw | null {
    return this.draws.length > 0 ? this.draws[0] : null
  }

  getLastDrawNumber(): number | null {
    return this.draws.length > 0 ? this.draws[0].drawNumber : null
  }

  getWinners(): OfficialList[] {
    return [...this.winners]
  }

  getWinnersFor(drawNumber: number): OfficialList | null {
    return this.winners.find((w) => w.drawNumber === drawNumber) ?? null
  }

  update(draws: Draw[]): void {
    this.draws = draws
    this.lastUpdated = new Date()
  }

  /** null until a refresh has looked for this draw's official list. */
  getWinnersStatus(drawNumber: number): WinnerListStatus | null {
    return this.winnersStatus[drawNumber] ?? null
  }

  getAllWinnersStatus(): Record<number, WinnerListStatus> {
    return { ...this.winnersStatus }
  }

  updateWinners({ lists, status }: WinnerListsResult): void {
    this.winners = lists
    this.winnersStatus = status
  }

  getRifa(): RifaResult | null {
    return this.rifa
  }

  updateRifa(rifa: RifaResult): void {
    this.rifa = rifa
  }

  isEmpty(): boolean {
    return this.draws.length === 0
  }
}

export const store = new DrawStore()
