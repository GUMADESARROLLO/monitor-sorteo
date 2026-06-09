import type { AstroIntegration } from 'astro'

export function monitorIntegration(): AstroIntegration {
  return {
    name: 'monitor-integration',
    hooks: {},
  }
}
