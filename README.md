# API Studio

Cliente de APIs de escritorio construido con Tauri 2, React, TypeScript y Rust.

Versión actual: **0.2.0**. Consulta [CHANGELOG.md](CHANGELOG.md) para cambios publicados y [ROADMAP.md](ROADMAP.md) para el estado y los pendientes.

## Funciones disponibles

- Solicitudes GET, POST, PUT, PATCH, DELETE, HEAD y OPTIONS.
- Parámetros de URL y encabezados configurables.
- Autenticación Bearer, Basic Auth y API Key por header o query parameter.
- Cuerpos JSON, XML, texto, URL-encoded o sin body.
- Validación y formato de JSON; validación de XML.
- Respuesta formateada con estado, duración, tamaño y headers.
- Conversión de respuestas XML a JSON.
- Ejecución automática por intervalo, sin solicitudes superpuestas.
- Historial local de las últimas 50 solicitudes.
- Solicitudes guardadas, pantalla de monitores y configuración persistente.

## Desarrollo

Requisitos: Node.js 20+, Rust estable y las dependencias de compilación de Tauri para Windows.

En Windows se puede preparar el entorno con el instalador incluido. Rust se guardará dentro de `.tools` para mantenerlo aislado del resto del sistema:

```powershell
.\scripts\setup-windows.ps1
.\scripts\dev.ps1
```

El instalador verifica primero que exista el componente **Desktop development with C++** de Visual Studio Build Tools.

Instalación manual alternativa:

```powershell
npm install
npm run tauri dev
```

Para validar únicamente la interfaz web:

```powershell
npm run dev
```

La versión web usa `fetch` como respaldo y puede estar limitada por CORS. La aplicación Tauri ejecuta las solicitudes mediante el backend nativo en Rust.
