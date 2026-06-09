# API — Monitor Lotería Nacional

## Frontend

```
http://localhost:4321
```

Interfaz visual con tarjetas de los últimos sorteos.

## Endpoints

### Obtener últimos 3 sorteos

```
GET /api/draws
```

Respuesta:

```json
{
  "updatedAt": "2026-06-09T18:00:00.000Z",
  "draws": [
    {
      "drawNumber": 2281,
      "winnerNumber": "09499",
      "prize": "8000000",
      "date": "2026-06-02"
    },
    {
      "drawNumber": 2280,
      "winnerNumber": "32347",
      "prize": "33000000",
      "date": "2026-05-26"
    },
    {
      "drawNumber": 2279,
      "winnerNumber": "29034",
      "prize": "10000000",
      "date": "2026-05-12"
    }
  ]
}
```

### Obtener último sorteo

```
GET /api/draws/latest
```

Respuesta:

```json
{
  "updatedAt": "2026-06-09T18:00:00.000Z",
  "draw": {
    "drawNumber": 2281,
    "winnerNumber": "09499",
    "prize": "8000000",
    "date": "2026-06-02"
  }
}
```

### Forzar actualización

```
GET /api/refresh
```

Forza un scrape del sitio y reemplaza el cache en memoria. Misma respuesta que `GET /api/draws`.

### Health Check

```
GET /api/health
```

Respuesta:

```json
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2026-06-09T18:00:00.000Z"
}
```
