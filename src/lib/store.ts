import type { Draw } from './types'

class DrawStore {
  private draws: Draw[] = []
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

  update(draws: Draw[]): void {
    this.draws = draws
    this.lastUpdated = new Date()
  }

  isEmpty(): boolean {
    return this.draws.length === 0
  }
}

export const store = new DrawStore()
