import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import node from '@astrojs/node'
import { monitorIntegration } from './src/integrations/monitor'

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [monitorIntegration()],
  vite: {
    plugins: [tailwindcss()],
  },
})
