# Feature · Atracciones

Módulo de **Atracciones** (canal Booking público) del frontend Pooking. Implementa el flujo completo de descubrimiento, detalle y reserva de tours, museos y experiencias contra el microservicio de Atracciones expuesto en el API Gateway.

> **Estado actual:** UI completa + integración real contra el API Gateway. Pantalla de pago aún pendiente.

---

## Estructura de carpetas

```
src/app/features/atracciones/
├── README.md                          ← este archivo
├── atracciones-list/                  ← Listado + filtros laterales
│   ├── atracciones-list.component.ts
│   ├── atracciones-list.component.html
│   └── atracciones-list.component.css
├── atracciones-detail/                ← Detalle de una atracción
│   ├── atracciones-detail.component.ts
│   ├── atracciones-detail.component.html
│   └── atracciones-detail.component.css
├── atracciones-reserva/               ← Flujo de reserva (fecha → horario → tickets → cliente)
│   ├── atracciones-reserva.component.ts
│   ├── atracciones-reserva.component.html
│   └── atracciones-reserva.component.css
├── models/
│   └── atracciones.models.ts          ← Interfaces 1:1 con el contrato
└── services/
    └── atracciones.service.ts         ← Cliente HTTP único del feature
```

## Rutas

Registradas en [`src/app/app.routes.ts`](../../app.routes.ts) como lazy:

| Path                                    | Componente                      |
| --------------------------------------- | ------------------------------- |
| `/atracciones`                          | `AtraccionesListComponent`      |
| `/atracciones/:id`                      | `AtraccionesDetailComponent`    |
| `/atracciones/:id/reservar`             | `AtraccionesReservaComponent`   |

El listado también puede recibir `queryParams` desde el buscador general (`/buscar?tab=atracciones`):

- `ciudad=Quito`
- `fecha=2026-05-26`
- `tipo=cultural`

---

## Configuración del proveedor (API Gateway)

El microservicio vive detrás del bus con el patrón `/{integrante}/api/v2/...`. El proveedor activo se controla **desde un único lugar** en [`services/atracciones.service.ts`](services/atracciones.service.ts):

```ts
export const ATTRACTION_PROVIDERS = {
  JHONATAN: 'jhonatan',
  LUIS: 'luis',
} as const;

export type AttractionProvider =
  (typeof ATTRACTION_PROVIDERS)[keyof typeof ATTRACTION_PROVIDERS];

export const ACTIVE_ATTRACTION_PROVIDER: AttractionProvider =
  ATTRACTION_PROVIDERS.JHONATAN;

export function buildAttractionBasePath(
  provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER,
): string {
  return `/${provider}/api/v2`;
}
```

**Cambiar de integrante:** edita una sola línea — `ACTIVE_ATTRACTION_PROVIDER` — y las 10 URLs se reconstruyen automáticamente.

**Añadir un nuevo integrante (francisco, angel):** súmalo al objeto `ATTRACTION_PROVIDERS`. TypeScript bloquea valores fuera del catálogo.

La URL base completa se forma con:

```
environment.apiGatewayUrl + buildAttractionBasePath()
```

donde `environment.apiGatewayUrl` vive en [`src/environments/environment.ts`](../../../environments/environment.ts).

---

## Endpoints integrados

Todos definidos en [`atracciones.service.ts`](services/atracciones.service.ts). Devuelven `Observable<T>` con el shape exacto del contrato (`{ status, message, data, ... }`).

| # | Método del servicio                  | Endpoint                                                              |
|---|--------------------------------------|------------------------------------------------------------------------|
| 1 | `getAtracciones(query)`              | `GET  /{provider}/api/v2/atracciones`                                  |
| 2 | `getFiltros()`                       | `GET  /{provider}/api/v2/atracciones/filtros`                          |
| 3 | `getAtraccionDetalle(guid)`          | `GET  /{provider}/api/v2/atracciones/{guid}`                           |
| 4 | `getTicketsAtraccion(guid)`          | `GET  /{provider}/api/v2/atracciones/{guid}/tickets`                   |
| 5 | `getHorarios(guid, fecha?)`          | `GET  /{provider}/api/v2/atracciones/{guid}/horarios`                  |
| 6 | `getHorarioTickets(guid, horGuid)`   | `GET  /{provider}/api/v2/atracciones/{guid}/horarios/{horGuid}/tickets`|
| 7 | `crearReserva(payload)`              | `POST /{provider}/api/v2/reservas`                                     |
| 8 | `getReservas(page, limit)`           | `GET  /{provider}/api/v2/reservas`                                     |
| 9 | `getReservaDetalle(guid)`            | `GET  /{provider}/api/v2/reservas/{guid}`                              |
| 10| `confirmarPago(guid, body)`          | `POST /{provider}/api/v2/reservas/{guid}/pagos/confirmacion`           |

### Query params del listado

`armarParams()` arma `HttpParams` solo con valores presentes — los nombres coinciden 1:1 con el contrato:

`ciudad`, `tipo`, `subtipo`, `idioma`, `etiqueta`, `calificacion_min`, `hora_inicio`, `disponible`, `ordenar_por`, `page`, `limit`.

---

## Modelos / interfaces

[`models/atracciones.models.ts`](models/atracciones.models.ts) — todas las interfaces son fieles al JSON del contrato:

- **Listado:** `Atraccion`, `Disponibilidad`, `AtraccionLinks`, `Pagination`, `FilterStats`, `Sorter`, `AtraccionesListResponse`
- **Filtros:** `FilterOption`, `FilterImage`, `FiltrosData`, `FiltrosResponse`
- **Detalle:** `Ticket`, `AtraccionDetalle`, `AtraccionDetalleResponse`
- **Horarios:** `Horario`, `HorariosResponse`, `HorarioTicketsResponse`
- **Reserva:** `ClienteInvitado`, `LineaReserva`, `ReservaPayload`, `ReservaCreada`, `ReservaCreadaDetalle`, `ReservaResponse`
- **Listado de reservas:** `ReservaResumida`, `ReservasListResponse`
- **Pago:** `PagoConfirmacionBody`, `FacturaCreada`, `PagoConfirmacionResponse`
- **Query:** `AtraccionesQuery`

No hay campos inventados. Cualquier propiedad opcional del contrato está marcada con `?` o `| null`.

---

## Pantallas

### 1. Listado — `AtraccionesListComponent`

- **Hero** con imagen de fondo (`assets/images/search_resultado_fondo_atrac.jpg`), buscador glass con: Destino o ciudad, Fecha (`min=today`), Tipo de atracción. Botón **Buscar**.
- **Barra de resumen** con `filteredProductCount / unfilteredProductCount` y selector "Ordenar por" alimentado de `response.sorters` (Recomendados / Menor precio / Mejor calificación, fieles a los `value`s del contrato: `trending`, `lowest_price`, `highest_weighted_rating`).
- **Sidebar lateral** con 7 secciones, todas alimentadas desde `getFiltros()`:
  - Destino (`destinationFilters`)
  - Tipo de atracción (`typeFilters`)
  - Etiquetas (`labelFilters`)
  - Calificación mínima (`minRatingFilter`)
  - Horario del día (`timeOfDayFilters`)
  - Idiomas (`supportedLanguageFilters`)
  - Disponibilidad (`disponible=true`)
- Cada opción es **single-value** (igual que el contrato) y muestra su `name` + un contador con `productCount`. Las opciones con `productCount = 0` quedan deshabilitadas.
- **Tarjetas horizontales** con `imagen_principal`, badges de tipo y disponibilidad, descripción, meta (duración, calificación, idiomas, cupos), chips de etiquetas e idiomas, indicador de disponibilidad (`Disponible hoy` / `Próxima fecha` / `Sin disponibilidad`), precio y botones **Ver detalle** / **Seleccionar**.
- **Paginación** controlada por `pagination.total_pages` (oculta si solo hay 1 página).
- **Validación de fecha:** input `[min]="today"` + chequeo en `buscar()` con mensaje `"No puedes buscar con una fecha anterior a la actual."`
- **Estados:** `loading` (spinner), `error` (retry), `empty` (limpiar filtros), `success`.

### 2. Detalle — `AtraccionesDetailComponent`

- **Hero** con `imagen_principal` de fondo + overlay degradado oscuro, breadcrumb (Atracciones › tipo › subtipo), botón Volver, badges (tipo / subtipo / disponibilidad), título, ciudad/país, `descripcion_corta`, meta (calificación, duración, idiomas).
- **Subnav sticky** con anclas: Descripción · Galería · Incluye · Punto de encuentro · Tickets.
- **Galería** con imagen activa grande + miniaturas (mezcla `imagen_principal` + `imagenes` sin duplicar; oculta si solo hay una).
- **Incluye / No incluye** en dos columnas + dos píldoras logísticas (`incluye_transporte`, `incluye_acompaniante`) que se iluminan si son `true`.
- **Punto de encuentro** destacado.
- **Tickets** con cards mostrando `tipo`, `precio`, `moneda` y `tck_guid` (monoespacio).
- **Sidebar sticky de reserva:** precio_desde, duración, calificación, idiomas en chips, bloque de disponibilidad con tres estados (`disponible_hoy` / `proxima_fecha_disponible` / sin disponibilidad), botón **Reservar ahora** → `/atracciones/:id/reservar`.
- **Estados:** `loading` (spinner), `error` (retry), `not_found` (404 detectado por `err.status`), `success`.

### 3. Reserva — `AtraccionesReservaComponent`

Inspirado visualmente en el flujo de Alojamientos (breadcrumb + steps + main + sidebar), pero adaptado al vocabulario de experiencias.

**Flujo:**
1. **Fecha de visita** — `<input type="date" [min]="today">`. Al cambiar, se llama `getHorarios(guid, fecha)`.
2. **Horarios disponibles** — cards seleccionables con `fecha`, `hora_inicio`–`hora_fin` y `cupos`. Al seleccionar se llama `getHorarioTickets(guid, hor_guid)`.
3. **Tickets** — counter por `tck_guid`. Mínimo 0, máximo limitado por los `cupos` del horario seleccionado.
4. **Datos del cliente invitado** — formulario con los 7 campos del contrato (`direccion` opcional), validación inline con `isFieldError` / `getFieldErrorMsg` / `onTouch`.

**Sidebar live:** imagen + nombre + ubicación de la atracción, fecha de visita, horario seleccionado, lista de tickets seleccionados con cantidad, **subtotal estimado** (marcado como estimado — sin inventar IVA), botón **Reservar ahora**, error inline si el POST falla.

**Al pulsar Reservar:**
- Marca touched todos los campos del cliente.
- Si `puedeReservar` (fecha válida + horario + ≥1 ticket + cliente válido), construye el `ReservaPayload` con los nombres del contrato:

```json
{
  "at_guid": "...",
  "hor_guid": "...",
  "fecha_visita": "YYYY-MM-DD",
  "lineas": [{ "tck_guid": "...", "cantidad": 2 }],
  "origen_canal": "BOOKING",
  "cliente_invitado": {
    "tipo_identificacion": "CEDULA",
    "numero_identificacion": "...",
    "nombres": "...",
    "apellidos": "...",
    "correo": "...",
    "telefono": "...",
    "direccion": "..."
  }
}
```

- Llama `svc.crearReserva(payload)`. Con la respuesta real, alimenta el modal de confirmación.

**Manejo de errores HTTP (`mensajeErrorReserva`):**
- Prioriza `details[0]` del body del contrato.
- Luego `message` del body.
- Fallback por código HTTP: 409 (sin cupos), 404 (no encontrado), 400 (datos inválidos), otros (genérico).

### Modal de "Reserva creada"

Reemplaza el antiguo modal técnico del payload por una pantalla amigable estilo Alojamientos pero con vocabulario de atracciones (Atracción, Fecha de visita, Horario, Estado, Subtotal, IVA, Total, Tickets — sin "hotel"/"check-in"/"check-out").

Alimentado **directamente desde `resp.data` del POST** (`ReservaCreada`):

- Icono check verde + título "¡Reserva creada!" + mensaje "Pendiente de confirmación de pago. Los cupos han sido bloqueados temporalmente."
- Tarjeta destacada con `rev_codigo` (monoespacio, seleccionable).
- Grid 2×2: **Atracción** (`atraccion_nombre`), **Estado** (pill ámbar "● PENDIENTE"), **Fecha de visita** (`hor_fecha`), **Horario** (`hor_hora_inicio` – `hor_hora_fin`).
- Lista de tickets desde `detalle[]` con `tck_tipo_participante`, `cantidad × precio_unit moneda` y `subtotal`.
- Totales: **Subtotal** (`rev_subtotal`), **IVA** (`rev_valor_iva`), **Total** (`rev_total`), banner "Saldo pendiente de pago".
- **Continuar al pago** → registra `_links.confirmar_pago` (pantalla de pago aún no implementada).
- **Ver mis reservas** → navega a `/atracciones` por ahora (`TODO(navegación)`).
- Toggle discreto **Ver payload técnico (debug)** que expande el JSON enviado al backend — útil en desarrollo, no visible por defecto.

---

## Manejo de estados

Cada pantalla maneja explícitamente los 4 estados:

| Estado        | UI                                                       |
| ------------- | -------------------------------------------------------- |
| `loading`     | Spinner centrado con texto descriptivo.                  |
| `error`       | Mensaje + botón **Reintentar**.                          |
| `not_found`   | Vista amigable con botón **Volver al listado**.          |
| `empty`       | Mensaje sugiriendo limpiar filtros o cambiar criterios.  |
| `success`     | Contenido normal.                                        |

Los errores HTTP se dejan propagar hasta el `subscribe` del componente (sin `catchError` que los oculte). El componente decide si el error es 404 (`not_found`) u otro (`error`).

---

## Reglas que respeta la integración

- **Sin campos inventados.** Cada propiedad coincide literalmente con el contrato.
- **`tagname` para enviar, `name` para mostrar.** Los filtros laterales muestran `name` y mandan `tagname` al backend.
- **`idiomas_disponibles` sin asumir ISO.** `idiomaLabel()` resuelve **primero** contra `supportedLanguageFilters.name`; si el backend devuelve `tagname: 'español'`, ese es el texto que se muestra.
- **Cantidades válidas.** El botón `−` se deshabilita en 0; el `+` se deshabilita al alcanzar los `cupos` del horario.
- **Validación de fecha.** No se permite seleccionar fechas pasadas en el listado ni en la reserva.
- **`origen_canal: "BOOKING"` fijo.** Constante, según contrato.
- **`fecha_visita` viene del horario seleccionado** (no del date-picker), para garantizar coherencia con el `hor_guid`.

---

## Cómo continuar

Lo siguiente que toca conectar:

1. **Pantalla de pago** — usar `_links.confirmar_pago` del response de `crearReserva` y llamar a `svc.confirmarPago(guid, body)` con los datos del receptor.
2. **Mis reservas** — pantalla que consuma `svc.getReservas(page, limit)` y permita ver detalle vía `svc.getReservaDetalle(guid)`.
3. **Subtipos** (opcional) — el contrato soporta `subtipo` como query param y `childFilterOptions` en `typeFilters`; el sidebar actual solo muestra el primer nivel.

---

## Referencias

- **Contrato** del microservicio de Atracciones (v2.0.0, Mayo 2026) — endpoints, shapes y códigos de error.
- **Patrón de cliente HTTP** — espejado de [`features/cars/services/car.service.ts`](../cars/services/car.service.ts), adaptado para usar `message` (no `mensaje`) y prefijo `/atracciones` (no `/booking`).
- **Configuración base** — `provideHttpClient()` en [`src/app/app.config.ts`](../../app.config.ts), `apiGatewayUrl` en [`src/environments/`](../../../environments/).
