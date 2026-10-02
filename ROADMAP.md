# Estado y roadmap de API Studio

Versión actual: **0.2.0**  
Última actualización: **2026-10-02**

## Terminado

- [x] Aplicación de escritorio Tauri para Windows.
- [x] GET, POST, PUT, PATCH, DELETE, HEAD y OPTIONS.
- [x] Parámetros y headers configurables.
- [x] Envío de JSON, XML, texto y URL-encoded.
- [x] Bearer Token, Basic Auth y API Key.
- [x] Visualización y formato de respuestas JSON.
- [x] Conversión XML a JSON.
- [x] Historial local persistente.
- [x] Solicitudes guardadas localmente.
- [x] Temporizador para la solicitud actual.
- [x] Configuración básica persistente.
- [x] Entorno de compilación de Windows y scripts de desarrollo.

## Próxima versión: 0.3.0

- [ ] Colecciones y carpetas.
- [ ] Base de datos SQLite.
- [ ] Editar, duplicar y eliminar solicitudes guardadas.
- [ ] Detectar cambios sin guardar.
- [ ] Ambientes y variables `{{variable}}`.
- [ ] Migrar automáticamente los datos actuales de `localStorage`.

## Versión 0.4.0

- [ ] `multipart/form-data`.
- [ ] Subida de archivos.
- [ ] Múltiples monitores independientes y persistentes.
- [ ] Historial y gráficas por monitor.
- [ ] Cancelación de solicitudes.
- [ ] Timeout y redirecciones configurables.

## Versiones posteriores

- [ ] Árbol expandible para JSON y XML.
- [ ] Vista tabular y buscador de respuestas.
- [ ] Descargar respuestas y manejar contenido binario.
- [ ] Conversión JSON a XML.
- [ ] Comparación entre respuestas.
- [ ] Cookies, proxy y certificados personalizados.
- [ ] OAuth 2.0, GraphQL y WebSockets.
- [ ] Importar Postman, OpenAPI y cURL.
- [ ] Generar código para distintos lenguajes.
- [ ] Validaciones automatizadas y ejecución de colecciones.
- [ ] Almacén seguro de credenciales de Windows.
- [ ] Instalador firmado y actualizaciones automáticas.

## Definición de terminado para 1.0.0

- Cliente HTTP estable con colecciones, ambientes y autenticación segura.
- Monitores persistentes y ejecución confiable.
- Importación y exportación de formatos comunes.
- Pruebas automatizadas y manejo global de errores.
- Instalador de Windows firmado y documentado.
