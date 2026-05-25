# GET /api/v1/accommodations/reservas/{reservaGuid}

> Nota: en el requerimiento aparece `accomodations`, pero en el Swagger local generado por el microservicio la ruta esta como `accommodations`. Si el endpoint no aparece publicado, revisar tambien la ruta equivalente `GET /api/v1/public/reservas/{reservaGuid}`.

## Descripcion

Consulta el detalle de una reserva generada usando su identificador publico `reservaGuid`.

Devuelve informacion general de la reserva, cliente asociado, sucursal, valores monetarios, estado y habitaciones reservadas.

## Metodo y URL

```http
GET /api/v1/accommodations/reservas/{reservaGuid}
```

Ejemplo:

```http
GET /api/v1/accommodations/reservas/3fa85f64-5717-4562-b3fc-2c963f66afa6
```

## Autenticacion

El requerimiento indica que debe tener validacion JWT y que para booking deberia validarse `clienteGuid` junto con `reservaGuid`.

En el controlador actual del microservicio esta ruta aparece como publica (`AllowAnonymous`) y Swagger local solo muestra el parametro de ruta `reservaGuid`. Por eso, si la regla final es obligatoria, se recomienda ajustar el endpoint o el Gateway para exigir:

- Header `Authorization: Bearer {token}`.
- Validacion de que la reserva consultada pertenezca al `clienteGuid` del token o al `clienteGuid` enviado por el flujo autorizado.

## Parametros

| Parametro | Ubicacion | Tipo | Obligatorio | Significado |
|---|---|---:|:---:|---|
| `reservaGuid` | Path | `uuid` | Si | Identificador publico de la reserva que se quiere consultar. |

## Query params

Swagger local no muestra query params para este endpoint.

Si se implementa la validacion requerida por booking, podria agregarse `clienteGuid` como query param o validarse desde el JWT. Actualmente no aparece como parametro en el contrato Swagger local.

## Respuesta exitosa

`200 OK`

Schema: `ReservaPublicDto`.

```json
{
  "reservaGuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "codigoReserva": "RES-20260508-0001",
  "clienteGuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "sucursalGuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "fechaReservaUtc": "2026-05-08T02:04:34.836Z",
  "fechaInicio": "2026-05-08T00:00:00.000Z",
  "fechaFin": "2026-05-10T00:00:00.000Z",
  "subtotalReserva": 200,
  "valorIva": 30,
  "totalReserva": 230,
  "descuentoAplicado": 0,
  "saldoPendiente": 230,
  "origenCanalReserva": "MARKETPLACE",
  "estadoReserva": "PEN",
  "fechaConfirmacionUtc": null,
  "fechaCancelacionUtc": null,
  "motivoCancelacion": null,
  "observaciones": "Reserva desde marketplace",
  "esWalkin": false,
  "habitaciones": [
    {
      "reservaHabitacionGuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "habitacionGuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "fechaInicio": "2026-05-08T00:00:00.000Z",
      "fechaFin": "2026-05-10T00:00:00.000Z",
      "numAdultos": 2,
      "numNinos": 0,
      "precioNocheAplicado": 100,
      "subtotalLinea": 200,
      "valorIvaLinea": 30,
      "descuentoLinea": 0,
      "totalLinea": 230,
      "estadoDetalle": "PEN"
    }
  ]
}
```

## Campos de respuesta

| Campo | Tipo | Significado |
|---|---:|---|
| `reservaGuid` | `uuid` | Identificador publico de la reserva. |
| `codigoReserva` | `string` | Codigo de reserva generado por el sistema. |
| `clienteGuid` | `uuid` | Identificador publico del cliente dueno de la reserva. |
| `sucursalGuid` | `uuid` | Identificador publico de la sucursal donde se reservo. |
| `fechaReservaUtc` | `date-time` | Fecha/hora UTC en que se creo la reserva. |
| `fechaInicio` | `date-time` | Fecha de inicio/check-in. |
| `fechaFin` | `date-time` | Fecha de fin/check-out. |
| `subtotalReserva` | `number` | Subtotal antes de impuestos o totales finales. |
| `valorIva` | `number` | Valor total de IVA de la reserva. |
| `totalReserva` | `number` | Total final de la reserva. |
| `descuentoAplicado` | `number` | Descuento global aplicado a la reserva. |
| `saldoPendiente` | `number` | Valor pendiente de pago. |
| `origenCanalReserva` | `string` | Canal desde el cual se creo la reserva, por ejemplo `MARKETPLACE`. |
| `estadoReserva` | `string` | Estado actual de la reserva. Valores esperados: `PEN`, `CON`, `CAN`, `EXP`, `FIN`, `EMI`. |
| `fechaConfirmacionUtc` | `date-time/null` | Fecha UTC en la que se confirmo la reserva. Puede ser `null`. |
| `fechaCancelacionUtc` | `date-time/null` | Fecha UTC en la que se cancelo la reserva. Puede ser `null`. |
| `motivoCancelacion` | `string/null` | Motivo de cancelacion si la reserva fue cancelada. |
| `observaciones` | `string/null` | Observaciones o notas ingresadas al crear la reserva. |
| `esWalkin` | `boolean` | Indica si la reserva fue registrada como presencial. |
| `habitaciones` | `array` | Lista de habitaciones asociadas a la reserva. |

## Campos de `habitaciones`

| Campo | Tipo | Significado |
|---|---:|---|
| `reservaHabitacionGuid` | `uuid` | Identificador publico del detalle de reserva de la habitacion. |
| `habitacionGuid` | `uuid` | Identificador publico de la habitacion fisica reservada. |
| `fechaInicio` | `date-time` | Fecha de inicio de uso de esa habitacion. |
| `fechaFin` | `date-time` | Fecha de fin de uso de esa habitacion. |
| `numAdultos` | `integer` | Numero de adultos registrados para esa habitacion. |
| `numNinos` | `integer` | Numero de ninos registrados para esa habitacion. |
| `precioNocheAplicado` | `number` | Precio por noche usado para calcular la linea. |
| `subtotalLinea` | `number` | Subtotal de la linea antes de IVA/total final. |
| `valorIvaLinea` | `number` | IVA calculado para esa habitacion/linea. |
| `descuentoLinea` | `number` | Descuento aplicado a esa habitacion/linea. |
| `totalLinea` | `number` | Total de esa habitacion/linea. |
| `estadoDetalle` | `string` | Estado del detalle de habitacion. Normalmente inicia como `PEN`. |

## Validaciones principales

- `reservaGuid` es obligatorio.
- `reservaGuid` debe tener formato UUID valido.
- Si `reservaGuid` es vacio o invalido, debe responder error de validacion.
- Si la reserva no existe, debe responder `404 Not Found`.
- Si se aplica la regla de booking/JWT, el cliente autenticado solo deberia poder consultar sus propias reservas.

## Errores posibles

| Estado | Cuando ocurre |
|---:|---|
| `400 Bad Request` | `reservaGuid` vacio, invalido o con formato incorrecto. |
| `401 Unauthorized` | Cuando se active JWT y no se envie token valido. |
| `403 Forbidden` | Cuando se active JWT y el cliente intente consultar una reserva que no le pertenece. |
| `404 Not Found` | No existe una reserva con ese `reservaGuid`. |
| `500 Internal Server Error` | Error interno no controlado. |

