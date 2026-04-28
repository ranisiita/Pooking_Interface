# Integracion backend-frontend de vuelos (Booking)

## Scope aplicado

- Backend objetivo: `Booking` sobre REST `api/v1`.
- Frontend objetivo: `Pooking_Interface`.
- Alcance funcional: busqueda/listado/detalle de vuelos modelados como `servicios` con tipo `Vuelos`.

## Configuracion usada en frontend

- Base URL: `environment.apiBaseUrl` en `src/environments/environment.development.ts`.
- Inyeccion: `API_CONFIG` en `src/app/app.config.ts`.
- Prefijo de URL: `api.interceptor.ts` agrega `baseUrl` a rutas relativas.
- Auth: `jwt.interceptor.ts` agrega `Authorization: Bearer ...` si hay token.

## Flujo de integracion implementado

1. **Bootstrap de tipo vuelos**
   - Archivo: `src/app/app.config.ts`.
   - Primero consulta `GET /api/v1/tipos-servicio/por-nombre?nombre=Vuelos`.
   - Si no llega `guid`, hace fallback a `GET /api/v1/tipos-servicio/activos` y busca por nombre `vuelos`.
   - Persiste `guidTipoVuelos` en `SearchStore`.

2. **Busqueda/listado**
   - Archivo: `src/app/pages/search/search.component.ts`.
   - Usa `ServiciosService.list(...)` enviando `guidTipo`, `termino`, `paginaActual` y `tamanoPagina`.
   - Archivo: `src/app/features/flights/search/flight-results.component.ts`.
   - Mantiene paginacion y reaplica `termino` del store en cada recarga.

3. **Detalle**
   - Archivo: `src/app/features/flights/detail/flight-detail.component.ts`.
   - Usa `GET /api/v1/servicios/{guid}/detalle` con el `guid` de la ruta.

## Endpoints REST de vuelos usados

- `GET /api/v1/tipos-servicio/por-nombre?nombre=Vuelos`
- `GET /api/v1/tipos-servicio/activos` (fallback de bootstrap)
- `GET /api/v1/servicios?guidTipo={guidVuelos}&termino={...}&paginaActual={n}&tamanoPagina={n}`
- `GET /api/v1/servicios/{guid}/detalle`

## Resultados de pruebas REST ejecutadas

Pruebas realizadas contra `https://localhost:7158`:

1. `GET /api/v1/tipos-servicio/por-nombre?nombre=Vuelos`
   - Resultado: `HTTP 500`
   - Body: `{\"success\":false,\"message\":\"Error interno del servidor.\",\"errors\":[]}`

2. `GET /api/v1/servicios?guidTipo=00000000-0000-0000-0000-000000000000&paginaActual=1&tamanoPagina=10`
   - Resultado: `HTTP 500`
   - Body: `{\"success\":false,\"message\":\"Error interno del servidor.\",\"errors\":[]}`

3. `GET /api/v1/servicios?guidTipo=00000000-0000-0000-0000-000000000000&paginaActual=0&tamanoPagina=101`
   - Resultado: `HTTP 400`
   - Body indica validaciones de `paginaActual` y `tamanoPagina` (comportamiento esperado).

4. `GET /api/v1/servicios/00000000-0000-0000-0000-000000000000/detalle`
   - Resultado: `HTTP 400`
   - Body: `GuidServicio no es valido`.

5. `GET /api/v1/servicios/11111111-1111-1111-1111-111111111111/detalle`
   - Resultado: `HTTP 500`
   - Esperado del plan: `404` para no encontrado.
   - Estado actual: backend no llega a rama de no encontrado por error interno previo.

## Lectura de estado para pruebas E2E UI

- Integracion frontend de vuelos por `servicios` quedo alineada.
- Falta estabilizar backend para pruebas felices (actualmente responde `500` en endpoints base).
- Cuando backend responda `200` en `tipos-servicio/por-nombre`, el frontend cargara `guidTipoVuelos` automaticamente en el arranque.

