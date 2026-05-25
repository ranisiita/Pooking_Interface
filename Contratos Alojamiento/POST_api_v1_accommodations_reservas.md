# POST /api/v1/accommodations/reservas



## Descripcion

Crea una reserva publica para una sucursal del hotel. El endpoint permite:

- Crear o reutilizar un cliente usando los datos del objeto `cliente`; la busqueda se realiza por `correo`.
- Solicitar habitaciones por `tipoHabitacionGuid` y `numHabitaciones`.
- Delegar la asignacion de habitaciones fisicas al servicio de Reservas.

La respuesta devuelve la reserva generada con sus valores calculados y el detalle de habitaciones.

## Metodo y URL

```http
POST /api/v1/accommodations/reservas
Content-Type: application/json
```

## Autenticacion

En el controlador actual aparece como publico (`AllowAnonymous`). Si el flujo final exige seguridad, se debe validar con Swagger publicado o agregar JWT en el API/Gateway.

## Body de entrada

Schema principal: `PublicReservaCreateRequest`.

```json
{
  "sucursalGuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "fechaInicio": "2026-05-08T00:00:00.000Z",
  "fechaFin": "2026-05-10T00:00:00.000Z",
  "observaciones": "Reserva desde marketplace",
  "esWalkin": false,
  "origenCanalReserva": "MARKETPLACE",
  "cliente": {
    "tipoIdentificacion": "CED",
    "numeroIdentificacion": "1723456789",
    "nombres": "Juan",
    "apellidos": "Perez",
    "correo": "juan.perez@example.com",
    "telefono": "0999999999",
    "direccion": "Quito"
  },
  "habitaciones": [
    {
      "tipoHabitacionGuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "numHabitaciones": 1,
      "numAdultos": 2,
      "numNinos": 0
    }
  ]
}
```

## Campos de entrada

| Campo | Tipo | Obligatorio | Significado |
|---|---:|:---:|---|
| `sucursalGuid` | `uuid` | Si | Identificador publico de la sucursal donde se hara la reserva. |
| `fechaInicio` | `date-time` | Si | Fecha de inicio/check-in de la reserva. |
| `fechaFin` | `date-time` | Si | Fecha de fin/check-out. Debe ser posterior a `fechaInicio`. |
| `observaciones` | `string` | No | Comentarios o notas de la reserva. |
| `esWalkin` | `boolean` | No | Indica si la reserva se registra como cliente presencial. Para booking normal usar `false`. |
| `origenCanalReserva` | `string` | No | Canal origen de la reserva. Si no se envia, el servicio usa `MARKETPLACE`. |
| `cliente` | `object` | Si | Datos para buscar o crear el cliente. El flujo publico no recibe `clienteGuid`. |
| `habitaciones` | `array` | Si | Lista de tipos de habitacion solicitados. Debe tener al menos un elemento. |

## Objeto `cliente`

| Campo | Tipo | Obligatorio | Significado |
|---|---:|:---:|---|
| `tipoIdentificacion` | `string` | Si | Tipo de documento del cliente, por ejemplo `CED`, `RUC` o `PAS`. |
| `numeroIdentificacion` | `string` | Si | Numero de identificacion. |
| `nombres` | `string` | Si | Nombres del cliente. |
| `apellidos` | `string` | No | Apellidos del cliente. |
| `correo` | `string` | Si | Correo electronico del cliente. |
| `telefono` | `string` | Si | Telefono de contacto. |
| `direccion` | `string` | No | Direccion del cliente. |

## Objeto `habitaciones`

| Campo | Tipo | Obligatorio | Significado |
|---|---:|:---:|---|
| `tipoHabitacionGuid` | `uuid` | Si | Identificador publico del tipo de habitacion solicitado. |
| `numHabitaciones` | `integer` | Si | Cantidad de habitaciones a reservar. Debe ser mayor que `0`. |
| `numAdultos` | `integer` | Si | Numero de adultos. Debe ser mayor que `0`. |
| `numNinos` | `integer` | Si | Numero de ninos. Puede ser `0`, no puede ser negativo. |

## Validaciones principales

- `sucursalGuid` es obligatorio.
- `fechaInicio` es obligatoria.
- `fechaFin` es obligatoria y debe ser posterior a `fechaInicio`.
- Debe enviarse el objeto `cliente`; el flujo publico/booking no acepta `clienteGuid`.
- Si se envia `cliente`, son obligatorios: `tipoIdentificacion`, `numeroIdentificacion`, `nombres`, `correo` y `telefono`.
- `habitaciones` debe tener al menos un elemento.
- En cada linea debe existir `tipoHabitacionGuid`; no se acepta `habitacionGuid` en la entrada.
- `numHabitaciones` y `numAdultos` deben ser positivos.
- `numNinos` no puede ser negativo.
- El contrato publico rechaza propiedades tipo ID numerico como `id`, `idCliente`, `idSucursal`; se deben usar GUIDs.
- El tipo debe permitir reserva publica y estar activo.
- Si no hay suficientes habitaciones disponibles, responde conflicto.

## Respuesta exitosa

Swagger muestra respuesta `200 OK` con `ReservaPublicDto`. En codigo se retorna `CreatedAtAction`, por lo que puede observarse como `201 Created` dependiendo del host/runtime.

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

## Significado de campos de respuesta

| Campo | Tipo | Significado |
|---|---:|---|
| `reservaGuid` | `uuid` | Identificador publico de la reserva generada. |
| `codigoReserva` | `string` | Codigo legible de la reserva. Sirve para consulta o soporte. |
| `clienteGuid` | `uuid` | Identificador publico del cliente asociado. |
| `sucursalGuid` | `uuid` | Identificador publico de la sucursal reservada. |
| `fechaReservaUtc` | `date-time` | Fecha/hora UTC en que se registro la reserva. |
| `fechaInicio` | `date-time` | Fecha de inicio de estadia. |
| `fechaFin` | `date-time` | Fecha de fin de estadia. |
| `subtotalReserva` | `number` | Valor antes de IVA y descuentos finales. |
| `valorIva` | `number` | IVA total calculado para la reserva. |
| `totalReserva` | `number` | Total de la reserva. |
| `descuentoAplicado` | `number` | Descuento global aplicado. |
| `saldoPendiente` | `number` | Monto pendiente de pago. |
| `origenCanalReserva` | `string` | Canal desde donde se creo la reserva. |
| `estadoReserva` | `string` | Estado de la reserva. Valores esperados: `PEN`, `CON`, `CAN`, `EXP`, `FIN`, `EMI`. |
| `fechaConfirmacionUtc` | `date-time/null` | Fecha UTC de confirmacion, si ya fue confirmada. |
| `fechaCancelacionUtc` | `date-time/null` | Fecha UTC de cancelacion, si fue cancelada. |
| `motivoCancelacion` | `string/null` | Motivo de cancelacion, si aplica. |
| `observaciones` | `string/null` | Notas registradas en la reserva. |
| `esWalkin` | `boolean` | Indica si fue una reserva presencial. |
| `habitaciones` | `array` | Detalle de habitaciones reservadas. |

## Errores posibles

| Estado | Cuando ocurre |
|---:|---|
| `400 Bad Request` | Faltan campos obligatorios, fechas invalidas, cantidades invalidas o se envian IDs numericos no permitidos. |
| `404 Not Found` | No existe el cliente, sucursal, tipo de habitacion o reserva relacionada. |
| `409 Conflict` | No hay habitaciones disponibles suficientes o existe conflicto con los datos actuales. |
| `422 Unprocessable Entity` | Error de reglas de negocio o restricciones de datos. |
| `500 Internal Server Error` | Error interno no controlado. |
