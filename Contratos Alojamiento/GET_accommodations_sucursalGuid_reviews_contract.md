# Contrato de API — GET `/api/v1/accommodations/{sucursalGuid}/reviews`

**Fuente normativa:** `endpoints_publicas.txt` (el JSON indicado allí es la forma obligatoria del cuerpo de respuesta, no un ejemplo ilustrativo).

**Versión:** v1  
**Método:** `GET`  
**Descripción:** Reseñas publicadas de una propiedad con metadatos de paginación.

---

## 1. Información General

| Atributo      | Detalle                                    |
|---------------|--------------------------------------------|
| Método HTTP   | `GET`                                      |
| URL           | `/api/v1/accommodations/{sucursalGuid}/reviews` |
| Autenticación | No requerida (público)                     |
| Content-Type  | `application/json`                         |

> **Nota:** En `endpoints_publicas.txt` la ruta de reviews aparece sin el prefijo `GET` en una línea; el verbo efectivo es `GET`, coherente con el resto del documento.

---

## 2. Parámetros de Entrada

### 2.1 Path

| Nombre          | Tipo            | Requerido | Descripción                    |
|-----------------|-----------------|-----------|--------------------------------|
| `sucursalGuid`  | `string($uuid)` | Sí        | Identificador de la sucursal.  |

### 2.2 Query (fuera de `endpoints_publicas.txt`)

La especificación pública adjunta no define parámetros de consulta. La implementación en `HotelLuxemburgo` puede aceptar `pagina` y `limite` para paginación; si se usan, los valores efectivos se devuelven en los campos homónimos del JSON de respuesta.

---

## 3. Respuesta exitosa — `200 OK`

**Cuerpo JSON (forma obligatoria):** misma estructura y nombres de propiedad que en `endpoints_publicas.txt`:

```json
{
  "items": [
    {
      "valoracionGuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "puntuacion": 0,
      "comentarioPositivo": "string",
      "comentarioNegativo": "string",
      "tipoViaje": "string",
      "fecha": "2026-05-13T14:52:24.491Z",
      "nombreVisibleCliente": "string",
      "respuestaPropiedad": "string"
    }
  ],
  "pagina": 0,
  "limite": 0,
  "totalResultados": 0,
  "totalPaginas": 0,
  "tieneSiguiente": true,
  "tieneAnterior": true
}
```

| Campo | Tipo | Descripción |
|--------|------|-------------|
| `items` | `array` | Lista de reseñas. Cada elemento incluye exactamente las claves del objeto de ejemplo. |
| `pagina` | `number` | Página actual (entero). |
| `limite` | `number` | Tamaño de página (entero). |
| `totalResultados` | `number` | Total de reseñas. |
| `totalPaginas` | `number` | Total de páginas. |
| `tieneSiguiente` | `boolean` | Indica si existe página siguiente. |
| `tieneAnterior` | `boolean` | Indica si existe página anterior. |

---

## 4. Errores

Si la sucursal no existe en alojamiento, la API puede responder `404` con cuerpo de error de aplicación (detalle en implementación). Un `sucursalGuid` inválido puede no coincidir con la ruta.

---

## 5. Diferencias de implementación (referencia código)

- Respuesta generada en `AccommodationsController.GetReviews` (`HotelLux.Accommodation.API`), solo bajo el prefijo **`/api/v1/accommodations`** (ya no bajo el alias `accomodations`, para alinear rutas públicas de búsqueda/detalle/reviews con `endpoints_publicas.txt`).
- Origen de ítems: servicio Stay vía gRPC; si Stay no está disponible, puede devolverse lista vacía con totales en cero.
