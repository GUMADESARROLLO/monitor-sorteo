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

### Ganadores de los últimos 3 sorteos

```
GET /api/draws/:numero/winners
GET /api/draws/latest/winners
```

Devuelve la lista de ganadores (sacada de la Lista Oficial en PDF) que cargó el último `GET /api/refresh`. Solo están los 3 sorteos más recientes; si todavía no se ha hecho un refresh responde `404`.

- `mainPrizes`: premios principales (`place` 1 = Premio Mayor) con sucursal.
- `approximations`: aproximaciones al Premio Mayor.
- `otherPrizes`: el resto de números premiados.

```json
{
  "drawNumber": 2302,
  "url": "https://loterianacional.com.ni/wp-content/uploads/2026/10/Lista-2302.pdf",
  "mainPrizes": [
    { "place": 1, "number": "09065", "prize": "8000000", "branch": "CHINANDEGA" },
    { "place": 2, "number": "60404", "prize": "800000", "branch": "JINOTEGA" }
  ],
  "approximations": [{ "number": "09062", "prize": "3800" }],
  "otherPrizes": [{ "number": "01128", "prize": "3000" }]
}
```

### Números de rifa premiados

```
GET /api/rifa
```

Resultado de la última búsqueda (hecha en `GET /api/refresh`): todos los números premiados de los últimos 3 sorteos que están asignados a un cliente en `PRODUCCION.dbo.NUMEROS_RIFA`, con nombre y dirección de `Softland.umk.CLIENTE`. Si un número ganó dos premios en el mismo sorteo aparece dos veces. Requiere las variables `DB_SQL_*` en `.env`.

```json
{
  "checkedAt": "2026-10-30T22:25:13.000Z",
  "matches": [
    {
      "drawNumber": 2302,
      "number": "09065",
      "prize": "8000000",
      "category": "Premio Mayor",
      "cliente": "04957",
      "nombre": "...",
      "direccion": "...",
      "factura": "00306202"
    }
  ]
}
```

Si la base de datos falla, la actualización de resultados sigue funcionando y `error` trae el motivo.

### Forzar actualización

```
GET /api/refresh
```

Forza un scrape del sitio, descarga las Listas Oficiales (PDF) de los últimos 3 sorteos y reemplaza el cache en memoria. Responde igual que `GET /api/draws` más un campo `winners` con la lista de ganadores de cada sorteo (mismo formato que `GET /api/draws/:numero/winners`). Si el PDF de un sorteo aún no está publicado, ese sorteo no aparece en `winners`.

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
