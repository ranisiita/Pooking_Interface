# Contrato de API — GET `/api/v1/accommodations/{sucursalGuid}`

**Versión:** v1  
**Método:** `GET`  
**Descripción:** Retorna el detalle público completo de una sucursal de alojamiento y, cuando se envía un rango (`fechaInicio` y `fechaFin`), verifica la disponibilidad de esa sucursal para ese periodo, desglosada por tipo de habitación.

---

## 1. Información General

| Atributo        | Detalle                                          |
|-----------------|--------------------------------------------------|
| Método HTTP     | `GET`                                            |
| URL Base        | `/api/v1/accommodations/{sucursalGuid}`          |
| Autenticación   | No requerida (endpoint público)                  |
| Content-Type    | `application/json`                               |
| Codificación    | UTF-8                                            |
| Uso con rango   | Con `fechaInicio` y `fechaFin` permite validar disponibilidad de la sucursal en un rango de fechas. |

---

## 2. Parámetros de Entrada

### 2.1 Parámetro de Ruta (Path Parameter)

| Nombre         | Tipo            | Requerido | Descripción                              |
|----------------|-----------------|-----------|------------------------------------------|
| `sucursalGuid` | `string($uuid)` | ✅ Sí     | Identificador público único de la propiedad (UUID v4). |

**Ejemplo:**
```
GET /api/v1/accommodations/3fa85f64-5717-4562-b3fc-2c963f66afa6
```

### 2.2 Parámetros de Consulta (Query Parameters)

| Nombre         | Tipo                   | Requerido | Descripción                                                                 |
|----------------|------------------------|-----------|-----------------------------------------------------------------------------|
| `fechaInicio` | `string($date-time)`   | ❌ No     | Inicio del rango de fechas usado para verificar la disponibilidad de la sucursal. Formato: ISO 8601. |
| `fechaFin`    | `string($date-time)`   | ❌ No     | Fin del rango de fechas usado para verificar la disponibilidad de la sucursal. Formato: ISO 8601.  |

> **Nota:** `fechaInicio` y `fechaFin` deben enviarse juntos para verificar disponibilidad en un rango. Si se omiten, el endpoint sigue devolviendo el detalle de la sucursal y `tiposHabitacion[].disponiblesEnRango` puede venir `null`.
>
> **Importante (contrato real):** La disponibilidad por rango se refleja en `tiposHabitacion[].disponiblesEnRango`. El objeto `disponibilidad` no forma parte del JSON de respuesta pública de este endpoint.

**Ejemplo con query params:**
```
GET /api/v1/accommodations/3fa85f64-5717-4562-b3fc-2c963f66afa6
    ?fechaInicio=2026-06-01T14:00:00.000Z
    &fechaFin=2026-06-05T12:00:00.000Z
```

---

## 3. Respuestas

### 3.1 Respuesta Exitosa — `200 OK`

**Media Type:** `application/json`

#### Estructura del cuerpo de respuesta

```json
{
  "sucursalGuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "nombre": "string",
  "ciudad": "string",
  "provincia": "string",
  "pais": "string",
  "direccion": "string",
  "descripcion": "string",
  "categoria": "string",
  "estrellas": 0,
  "tipoAlojamiento": "string",
  "precioDesde": 0,
  "moneda": "string",
  "imagenPrincipalUrl": "string",
  "promedioValoracion": 0,
  "totalValoraciones": 0,
  "habitacionesDisponibles": 0,
  "serviciosDestacados": ["string"],
  "horaCheckIn": "string",
  "horaCheckOut": "string",
  "aceptaNinos": true,
  "permiteMascotas": true,
  "descripcionCompleta": "string",
  "tiposHabitacion": [
    {
      "tipoHabitacionGuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "nombre": "string",
      "tipoCama": "string",
      "capacidadAdultos": 0,
      "capacidadNinos": 0,
      "areaM2": 0,
      "precioBase": 0,
      "imagenes": ["string"],
      "disponiblesEnRango": 0
    }
  ],
  "tarifasActivas": [
    {
      "tarifaGuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "nombre": "string",
      "precioPorNoche": 0,
      "moneda": "string",
      "fechaInicio": "2026-05-13T14:38:10.576Z",
      "fechaFin": "2026-05-13T14:38:10.576Z",
      "minNoches": 0,
      "tipoHabitacionGuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    }
  ],
  "amenities": ["string"],
  "imagenes": ["string"],
  "politicas": {
    "horaCheckIn": "string",
    "horaCheckOut": "string",
    "aceptaNinos": true,
    "permiteMascotas": true,
    "politicas": "string"
  }
}
```

---

#### Descripción detallada de campos de respuesta

##### Datos Generales de la Propiedad

| Campo                   | Tipo              | Descripción                                                           |
|-------------------------|-------------------|-----------------------------------------------------------------------|
| `sucursalGuid`          | `string($uuid)`   | Identificador único de la propiedad.                                 |
| `nombre`                | `string`          | Nombre comercial de la propiedad.                                    |
| `ciudad`                | `string`          | Ciudad donde se ubica la propiedad.                                  |
| `provincia`             | `string`          | Provincia o estado de la propiedad.                                  |
| `pais`                  | `string`          | País de la propiedad.                                                |
| `direccion`             | `string`          | Dirección física completa.                                           |
| `descripcion`           | `string`          | Descripción corta de la propiedad.                                   |
| `descripcionCompleta`   | `string`          | Descripción extendida con todos los detalles de la propiedad.        |
| `categoria`             | `string`          | Categoría del alojamiento (ej. "Hotel", "Hostel", "Resort").        |
| `estrellas`             | `integer`         | Clasificación en estrellas (rango esperado: 1–5).                   |
| `tipoAlojamiento`       | `string`          | Tipo de alojamiento (ej. "Hotel", "Apartamento", "Cabaña").         |
| `precioDesde`           | `number`          | Precio mínimo por noche disponible en la propiedad.                 |
| `moneda`                | `string`          | Código de moneda ISO 4217 (ej. "USD", "EUR").                       |
| `imagenPrincipalUrl`    | `string`          | URL de la imagen principal de la propiedad.                         |
| `promedioValoracion`    | `number`          | Promedio de valoraciones de huéspedes (ej. 4.5).                   |
| `totalValoraciones`     | `integer`         | Número total de valoraciones recibidas.                              |
| `habitacionesDisponibles` | `integer`       | Total de habitaciones disponibles al momento de la consulta.        |
| `serviciosDestacados`   | `array[string]`   | Lista de servicios o características destacadas de la propiedad.    |
| `horaCheckIn`           | `string`          | Hora estándar de check-in (ej. "14:00").                            |
| `horaCheckOut`          | `string`          | Hora estándar de check-out (ej. "12:00").                           |
| `aceptaNinos`           | `boolean`         | Indica si la propiedad acepta huéspedes menores de edad.            |
| `permiteMascotas`       | `boolean`         | Indica si la propiedad permite el ingreso de mascotas.              |
| `amenities`             | `array[string]`   | Lista de amenidades generales de la propiedad (ej. WiFi, Piscina).  |
| `imagenes`              | `array[string]`   | URLs de todas las imágenes de la propiedad.                         |

---

##### Tipos de Habitación — `tiposHabitacion[]`

Arreglo de objetos que describe cada tipo de habitación disponible en la propiedad.

| Campo                  | Tipo              | Descripción                                                                  |
|------------------------|-------------------|------------------------------------------------------------------------------|
| `tipoHabitacionGuid`   | `string($uuid)`   | Identificador único del tipo de habitación.                                 |
| `nombre`               | `string`          | Nombre descriptivo del tipo (ej. "Suite Deluxe", "Habitación Estándar").   |
| `tipoCama`             | `string`          | Tipo de cama disponible (ej. "King", "Twin", "Matrimonial").                |
| `capacidadAdultos`     | `integer`         | Número máximo de adultos permitidos.                                        |
| `capacidadNinos`       | `integer`         | Número máximo de niños permitidos.                                          |
| `areaM2`               | `number`          | Área de la habitación en metros cuadrados.                                  |
| `precioBase`           | `number`          | Precio base por noche para este tipo de habitación.                         |
| `imagenes`             | `array[string]`   | URLs de imágenes específicas del tipo de habitación.                        |
| `disponiblesEnRango`   | `integer`         | Número de habitaciones disponibles en el rango de fechas consultado. Requiere `fechaInicio` y `fechaFin`. |

---

##### Tarifas Activas — `tarifasActivas[]`

Arreglo de tarifas vigentes aplicables a los tipos de habitación.

| Campo                | Tipo                 | Descripción                                                            |
|----------------------|----------------------|------------------------------------------------------------------------|
| `tarifaGuid`         | `string($uuid)`      | Identificador único de la tarifa.                                     |
| `nombre`             | `string`             | Nombre de la tarifa (ej. "Tarifa Temporada Alta").                    |
| `precioPorNoche`     | `number`             | Precio por noche aplicado bajo esta tarifa.                           |
| `moneda`             | `string`             | Código de moneda ISO 4217 de la tarifa.                               |
| `fechaInicio`        | `string($date-time)` | Fecha y hora de inicio de vigencia de la tarifa (ISO 8601).           |
| `fechaFin`           | `string($date-time)` | Fecha y hora de fin de vigencia de la tarifa (ISO 8601).              |
| `minNoches`          | `integer`            | Mínimo de noches requerido para aplicar la tarifa.                    |
| `tipoHabitacionGuid` | `string($uuid)`      | Referencia al tipo de habitación al que aplica esta tarifa.           |

---

##### Políticas — `politicas`

Objeto que detalla las políticas de la propiedad.

| Campo          | Tipo      | Descripción                                                              |
|----------------|-----------|--------------------------------------------------------------------------|
| `horaCheckIn`  | `string`  | Hora oficial de check-in de la propiedad.                               |
| `horaCheckOut` | `string`  | Hora oficial de check-out de la propiedad.                              |
| `aceptaNinos`  | `boolean` | Si la propiedad acepta niños (puede diferir del campo raíz).            |
| `permiteMascotas` | `boolean` | Si la propiedad permite mascotas (puede diferir del campo raíz).     |
| `politicas`    | `string`  | Texto libre con las políticas generales del establecimiento.            |

---

### 3.2 Respuesta de Error — `400 Bad Request`

Se retorna cuando los parámetros enviados son inválidos o están mal formados.

**Media Type:** `application/json`

**Causas comunes:**
- `sucursalGuid` con formato no válido (no es un UUID v4).
- `fechaInicio` o `fechaFin` con formato de fecha incorrecto (no ISO 8601).
- `fechaFin` anterior a `fechaInicio`.

**Estructura esperada del error (genérica):**
```json
{
  "success": false,
  "message": "Descripción del error",
  "statusCode": 400,
  "errors": {
    "campo": ["detalle del error"]
  },
  "traceId": "0HNA...:00000001",
  "timestamp": "2026-05-13T14:38:10.576Z"
}
```

---

## 4. Reglas de Negocio

1. **UUID requerido:** El parámetro `sucursalGuid` debe ser un UUID v4 válido. Cualquier otro formato retornará `400`.
2. **Disponibilidad condicional:** El campo `disponiblesEnRango` (en `tiposHabitacion`) se calcula cuando se envían `fechaInicio` y `fechaFin`; con ambos parámetros se verifica la disponibilidad de la sucursal en el rango solicitado.
3. **Tarifas activas:** Solo se incluyen tarifas cuya vigencia (`fechaInicio` – `fechaFin`) esté activa en el momento de la consulta.
4. **Moneda:** La moneda puede variar entre el campo raíz (`moneda`) y las tarifas (`tarifasActivas[].moneda`); los consumidores deben usar la moneda específica de cada tarifa al calcular precios.
5. **Imágenes:** Las URLs en `imagenes` e `imagenPrincipalUrl` son absolutas y deben ser accesibles públicamente.

---

## 5. Ejemplos de Uso

### Consulta básica (sin fechas)

**Request:**
```
GET /api/v1/accommodations/3fa85f64-5717-4562-b3fc-2c963f66afa6
```

**Response `200 OK`:** Retorna toda la información de la propiedad; como no se envía rango, `disponiblesEnRango` puede venir `null` en cada tipo de habitación.

---

### Consulta con rango de fechas

**Request:**
```
GET /api/v1/accommodations/3fa85f64-5717-4562-b3fc-2c963f66afa6
    ?fechaInicio=2026-06-10T14:00:00.000Z
    &fechaFin=2026-06-15T12:00:00.000Z
```

**Response `200 OK`:** Retorna la propiedad con `disponiblesEnRango` poblado en cada tipo de habitación para el rango enviado.

---

### UUID inválido

**Request:**
```
GET /api/v1/accommodations/id-no-valido
```

**Response `400 Bad Request`:**
```json
{
  "success": false,
  "message": "sucursalGuid debe ser un UUID valido.",
  "statusCode": 400,
  "errors": null,
  "traceId": "0HNA...:00000001",
  "timestamp": "2026-05-13T14:38:10.576Z"
}
```

---

## 6. Resumen de Códigos de Respuesta

| Código HTTP | Descripción                                              |
|-------------|----------------------------------------------------------|
| `200 OK`    | Solicitud exitosa. Retorna el detalle de la propiedad.   |
| `400`       | Parámetros inválidos o mal formados.                     |

---

## 7. Notas Técnicas

- **Formato de fechas:** Todas las fechas siguen el estándar **ISO 8601** con zona horaria en UTC (sufijo `Z`). Ejemplo: `2026-06-10T14:00:00.000Z`.
- **Tipos numéricos:** Los campos `precioBase`, `precioPorNoche` y `precioDesde` son `number` (punto flotante); se recomienda manejarlos con precisión decimal en el cliente.
- **Arrays vacíos vs nulos:** Si no existen registros para `tiposHabitacion`, `tarifasActivas`, `amenities`, `imagenes` o `serviciosDestacados`, el API puede retornar un array vacío `[]` o el campo omitido; el cliente debe manejar ambos casos.
- **Sin paginación:** Este endpoint retorna todos los datos de la propiedad en una sola respuesta; no implementa paginación.
- **Sin autenticación:** El endpoint es de acceso público; no requiere token ni cabeceras de autorización.
