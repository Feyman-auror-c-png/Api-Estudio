# Requerimientos de API Studio

## Visión

API Studio será un cliente de APIs de escritorio enfocado en inspección clara de datos, automatización periódica y transformación entre JSON y XML. La primera plataforma soportada será Windows.

## MVP

### Solicitudes HTTP

- Métodos GET, POST, PUT, PATCH, DELETE, HEAD y OPTIONS.
- URL con parámetros editables y encabezados activables individualmente.
- Cuerpo JSON con validación antes del envío.
- Tiempo de espera de 60 segundos y hasta 10 redirecciones.
- Ejecución nativa desde Rust para no depender de CORS.

### Respuestas

- Estado HTTP, duración, tamaño, URL final y tipo de contenido.
- Vistas de cuerpo y encabezados.
- Formato automático de JSON.
- Conversión de XML a JSON conservando atributos con el prefijo `@`.
- Copia del contenido al portapapeles.

### Automatización

- Intervalo mínimo de dos segundos.
- Inicio y detención manual.
- Ejecución inmediata al iniciar el monitor.
- Prohibición de ejecuciones superpuestas.

### Persistencia

- Historial local de las últimas 50 ejecuciones.
- En la siguiente iteración, colecciones, carpetas y ambientes persistidos en SQLite.
- Los secretos nunca se almacenarán como texto plano en SQLite.

## Iteraciones

1. **Base funcional:** constructor HTTP, respuesta, XML a JSON, temporizador e historial local.
2. **Persistencia:** SQLite, colecciones, solicitudes guardadas y ambientes.
3. **Autenticación:** API Key, Bearer, Basic Auth y almacenamiento en el keyring de Windows.
4. **Herramientas:** búsqueda, comparación de respuestas, descarga e importación de cURL/OpenAPI.
5. **Monitoreo:** validaciones, gráficas, alertas y ejecución de colecciones.

## Criterios de aceptación de la base funcional

- Una solicitud GET válida muestra estado, tiempo, tamaño, headers y cuerpo.
- Una solicitud con JSON inválido se bloquea y explica el error.
- Una respuesta JSON se muestra indentada.
- Una respuesta XML válida se puede convertir a JSON.
- Un monitor ejecuta la solicitud en el intervalo seleccionado y se puede detener.
- Ninguna ejecución periódica comienza mientras la anterior sigue activa.
- El historial sobrevive al cierre de la aplicación.
