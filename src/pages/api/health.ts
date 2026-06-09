import type { APIRoute } from 'astro'

export const prerender = false

export const GET: APIRoute = async () => {
  const body = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
