# Changelog

Todos los cambios importantes de API Studio se documentarán aquí. El proyecto usa versionado semántico: `MAJOR.MINOR.PATCH`.

## [Sin publicar]

### Planeado

- Colecciones y carpetas.
- Persistencia mediante SQLite.
- Ambientes y variables.
- Formularios multipart y subida de archivos.
- Múltiples monitores independientes.

## [0.2.0] - 2026-10-02

### Añadido

- Navegación funcional entre solicitud, historial, monitores y configuración.
- Creación y guardado local de solicitudes.
- Historial persistente con estado, duración y fecha.
- Monitor periódico para la solicitud actual sin ejecuciones superpuestas.
- Preferencias persistentes para historial, formato e intervalo.
- Autenticación Bearer Token, Basic Auth y API Key.
- API Key mediante header o query parameter.
- Body JSON, XML, texto, URL-encoded y sin cuerpo.
- Validación de JSON y XML antes del envío.
- Selección automática de `Content-Type`.
- Conversión de respuestas XML a JSON.
- Icono propio de API Studio.
- Scripts de preparación y ejecución para Windows.
- Verificación automática de versiones entre frontend, Tauri y Rust.

### Seguridad

- Las credenciales de autenticación permanecen en memoria y no se guardan en `localStorage`.
- Las API Keys enviadas como query parameter no se escriben en el historial.

### Corregido

- Botones de Nueva solicitud, Historial, Monitores y Configuración sin acciones.
- Falta del icono requerido durante la compilación de Tauri.
- Actualización automática de `Content-Type` al cambiar el tipo de body.

## [0.1.0] - 2026-10-02

### Añadido

- Estructura inicial Tauri 2, React, TypeScript y Rust.
- Métodos GET, POST, PUT, PATCH, DELETE, HEAD y OPTIONS.
- Parámetros, headers, body JSON y visor básico de respuestas.
- Backend HTTP nativo con Reqwest.
- Interfaz oscura inicial.
