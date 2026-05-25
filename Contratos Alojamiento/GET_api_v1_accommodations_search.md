# GET /api/v1/accommodations/search

## Descripcion

Busca sucursales/alojamientos disponibles para el flujo publico de booking.

Si se llama sin parametros, devuelve todas las sucursales activas y no eliminadas, en formato paginado. Tambien permite filtrar por destino, fechas, capacidad, tipo de alojamiento, rango de precio y categoria de viaje.

## Metodo y URL

```http
GET /api/v1/accommodations/search
```

Ejemplo sin filtros:

```http
GET /api/v1/accommodations/search
```

Ejemplo con filtros:

```http
GET /api/v1/accommodations/search?Destino=Quito&fechaInicio=2026-05-20T00:00:00.000Z&fechaFin=2026-05-22T00:00:00.000Z&NumAdultos=2&NumNinos=0&NumHabitaciones=1&OrdenarPor=precio_desc&Pagina=1&Limite=20
```

## Autenticacion

El controlador actual esta marcado como publico (`AllowAnonymous`), por lo que no requiere JWT.

## Query params

Swagger local muestra estos parametros:

| Parametro | Tipo | Obligatorio | Significado |
|---|---:|:---:|---|
| `Destino` | `string` | No | Texto de busqueda para ciudad, provincia, pais, nombre de sucursal o direccion. |
| `fechaInicio` | `date-time` | Condicional | Fecha de entrada/check-in. Si se envia, tambien debe enviarse `fechaFin`. |
| `fechaFin` | `date-time` | Condicional | Fecha de salida/check-out. Debe ser posterior a `fechaInicio`. |
| `NumAdultos` | `integer` | No | Cantidad de adultos. Filtra sucursales con tipos de habitacion que soporten esa capacidad. No puede ser negativo. |
| `NumNinos` | `integer` | No | Cantidad de ninos. Filtra sucursales con tipos de habitacion que soporten esa capacidad. No puede ser negativo. |
| `NumHabitaciones` | `integer` | No | Cantidad minima de habitaciones disponibles. No puede ser negativo. |
| `TipoAlojamiento` | `string` | No | Filtra por tipo de alojamiento, por ejemplo hotel, hostal, resort, etc. |
| `PrecioMin` | `number` | No | Precio minimo por noche. Compara contra `precioDesde`. |
| `PrecioMax` | `number` | No | Precio maximo por noche. Debe ser mayor o igual a `PrecioMin`. |
| `CategoriaViaje` | `string` | No | Filtra por categoria de viaje configurada en la sucursal. |
| `OrdenarPor` | `string` | No | Criterio de ordenamiento. Valores soportados: `precio_desc`, `precio-desc`, `valoracion`, `rating`, `nombre`. Si no se envia, ordena por menor precio y mejor valoracion. |
| `Pagina` | `integer` | No | Numero de pagina. Por defecto `1`. Si llega menor a `1`, se normaliza a `1`. |
| `Limite` | `integer` | No | Cantidad de resultados por pagina. Por defecto `20`. Se limita entre `1` y `50`. |
| `api-version` | `string` | No | Parametro opcional de versionamiento mostrado por Swagger. |

## Validaciones principales

- No se permiten parametros de ID numerico como `id`, `idSucursal`, `idHabitacion`. En endpoints publicos se deben usar GUIDs.
- `fechaInicio` y `fechaFin` deben enviarse juntas.
- `fechaFin` debe ser posterior a `fechaInicio`.
- `NumAdultos`, `NumNinos` y `NumHabitaciones` no pueden ser negativos.
- Si se envian `PrecioMin` y `PrecioMax`, `PrecioMax` debe ser mayor o igual a `PrecioMin`.
- `Pagina` se normaliza a minimo `1`.
- `Limite` se normaliza entre `1` y `50`.

## Respuesta exitosa

`200 OK`

Schema: `BookingPagedResponseDTO<AccommodationSearchItemDTO>`.

```json
{
  "items": [
    {
      "sucursalGuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "nombre": "Hotel Las Velas Quito",
      "ciudad": "Quito",
      "provincia": "Pichincha",
      "pais": "Ecuador",
      "direccion": "Av. Amazonas N34-123",
      "descripcion": "Hotel centrico para viajes de negocio y turismo.",
      "categoria": "NEGOCIOS",
      "estrellas": 4,
      "tipoAlojamiento": "HOTEL",
      "precioDesde": 85,
      "moneda": "USD",
      "imagenPrincipalUrl": "https://example.com/hotel.jpg",
      "promedioValoracion": 4.6,
      "totalValoraciones": 25,
      "habitacionesDisponibles": 12,
      "serviciosDestacados": [
        "Wifi",
        "Desayuno",
        "Piscina"
      ],
      "horaCheckIn": "14:00",
      "horaCheckOut": "12:00",
      "aceptaNinos": true,
      "permiteMascotas": false
    }
  ],
  "pagina": 1,
  "limite": 20,
  "totalResultados": 1,
  "totalPaginas": 1,
  "tieneSiguiente": false,
  "tieneAnterior": false
}
```

## Campos de respuesta

| Campo | Tipo | Significado |
|---|---:|---|
| `items` | `array` | Lista de sucursales/alojamientos que cumplen los filtros. |
| `pagina` | `integer` | Pagina actual devuelta. |
| `limite` | `integer` | Numero maximo de elementos por pagina. |
| `totalResultados` | `integer` | Total de registros encontrados antes de paginar. |
| `totalPaginas` | `integer` | Total de paginas disponibles. |
| `tieneSiguiente` | `boolean` | Indica si existe una pagina posterior. |
| `tieneAnterior` | `boolean` | Indica si existe una pagina anterior. |

## Campos de cada item

| Campo | Tipo | Significado |
|---|---:|---|
| `sucursalGuid` | `uuid` | Identificador publico de la sucursal. Este GUID se usa para consultar detalle o habitaciones. |
| `nombre` | `string` | Nombre comercial de la sucursal/alojamiento. |
| `ciudad` | `string/null` | Ciudad donde se ubica la sucursal. |
| `provincia` | `string/null` | Provincia o region de la sucursal. |
| `pais` | `string/null` | Pais de la sucursal. |
| `direccion` | `string/null` | Direccion fisica de la sucursal. |
| `descripcion` | `string/null` | Descripcion corta de la sucursal. |
| `categoria` | `string/null` | Categoria de viaje configurada, por ejemplo familiar, negocios, pareja, etc. |
| `estrellas` | `integer/null` | Clasificacion por estrellas del alojamiento. |
| `tipoAlojamiento` | `string/null` | Tipo de alojamiento, por ejemplo hotel, hostal, resort, departamento. |
| `precioDesde` | `number/null` | Menor precio base encontrado entre habitaciones disponibles de la sucursal. |
| `moneda` | `string` | Moneda del precio. Por defecto `USD`. |
| `imagenPrincipalUrl` | `string/null` | URL de la imagen principal del alojamiento o de sus tipos de habitacion. |
| `promedioValoracion` | `number/null` | Promedio de valoraciones aprobadas y publicadas. |
| `totalValoraciones` | `integer` | Cantidad de valoraciones aprobadas y publicadas. |
| `habitacionesDisponibles` | `integer` | Numero de habitaciones en estado disponible (`DIS`) para la sucursal. |
| `serviciosDestacados` | `array<string>` | Lista de servicios/amenidades destacadas. El servicio toma hasta 6. |
| `horaCheckIn` | `string/null` | Hora configurada para check-in. |
| `horaCheckOut` | `string/null` | Hora configurada para check-out. |
| `aceptaNinos` | `boolean` | Indica si la sucursal acepta ninos. |
| `permiteMascotas` | `boolean` | Indica si la sucursal permite mascotas. |

## Comportamiento de filtros

- `Destino` busca coincidencias en ciudad, provincia, pais, nombre de sucursal y direccion.
- `TipoAlojamiento` y `CategoriaViaje` hacen busqueda por coincidencia de texto.
- `NumHabitaciones` compara contra `habitacionesDisponibles`.
- `PrecioMin` y `PrecioMax` comparan contra `precioDesde`.
- `NumAdultos` y `NumNinos` filtran por tipos de habitacion activos, publicos y con capacidad suficiente.
- La busqueda solo considera sucursales activas (`estadoSucursal = ACT`) y no eliminadas.

## Ordenamiento

| Valor | Resultado |
|---|---|
| `precio_desc` o `precio-desc` | Ordena por precio desde mayor a menor. |
| `valoracion` o `rating` | Ordena por mejor valoracion y luego menor precio. |
| `nombre` | Ordena alfabeticamente por nombre. |
| Vacio o no reconocido | Ordena por menor precio y luego mejor valoracion. |

## Errores posibles

| Estado | Cuando ocurre |
|---:|---|
| `400 Bad Request` | Fechas incompletas, rango de fechas invalido, cantidades negativas, rango de precios invalido o parametros ID numericos no permitidos. |
| `422 Unprocessable Entity` | Error de reglas de negocio o restricciones de datos. |
| `500 Internal Server Error` | Error interno no controlado. |

