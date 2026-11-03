import type { Draw, OfficialList, RifaResult } from './types'

class DrawStore {
  private draws: Draw[] = []
  private winners: OfficialList[] = []
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

  updateWinners(winners: OfficialList[]): void {
    this.winners = winners
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
