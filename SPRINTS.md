# 📋 Sprints - Music 4 All

## Sprint 0 – Setup ✅ 
**Estado**: Completado  
**Objetivo**: Crear el repo y la estructura de carpetas

### Tareas completadas:
- [x] Estructura de carpetas (backend, frontend)
- [x] Requirements.txt con dependencias base
- [x] .gitignore configurado
- [x] README.md
- [x] .env.example
- [x] docker-compose.yml
- [x] Archivos iniciales (main.py, config.py, schemas, etc.)

**Commit**: `Initial commit: Sprint 0 - Music 4 All structure setup`

---

## Sprint 1 – Backend core
**Objetivo**: Migrar TidalDownloader e implementar DownloadManager

### Tareas:
- [ ] Copiar TidalDownloader desde `downloader.py` (adaptar imports)
- [ ] Implementar `DownloadManager` completo (cola, progreso, hilos)
- [ ] Script simple de prueba para descargar localmente
- [ ] Validar funcionamiento sin API

---

## Sprint 2 – API REST
**Objetivo**: Crear endpoints FastAPI

### Tareas:
- [ ] Endpoint `POST /api/v1/auth/login` (dummy authentication)
- [ ] Endpoint `GET /api/v1/metadata/search?q=...`
- [ ] Endpoint `POST /api/v1/download/start`
- [ ] Endpoint `GET /api/v1/download/status/{job_id}`
- [ ] Endpoint `GET /api/v1/download/file/{job_id}`
- [ ] Probar en Swagger UI (http://localhost:8000/docs)

---

## Sprint 3 – WebSocket de progreso
**Objetivo**: Transmitir progreso en tiempo real

### Tareas:
- [ ] Implementar `WS /api/v1/ws/progress/{job_id}`
- [ ] Integrar con DownloadManager para enviar actualizaciones
- [ ] Cliente JS para conectar al WebSocket

---

## Sprint 4 – Frontend base
**Objetivo**: Interfaz React funcional

### Tareas:
- [ ] Proyecto React con Vite
- [ ] Tema neón (colores, tipografía, CSS globales)
- [ ] Página Login (formulario + auth)
- [ ] Página Dashboard (búsqueda estática)
- [ ] Componentes estáticos (NeonTitle, VinylCard, ProgressBar)

---

## Sprint 5 – Integración full
**Objetivo**: Todo funciona end-to-end

### Tareas:
- [ ] Conectar frontend con backend (axios)
- [ ] Flujo: Login → Búsqueda → Ver tracks → Descargar
- [ ] WebSocket en el frontend (actualizar progreso en tiempo real)
- [ ] Descargar archivo automáticamente al completar

---

## Sprint 6 – Pulido visual y efectos retro
**Objetivo**: Experiencia premium

### Tareas:
- [ ] Partículas y efectos neón animados
- [ ] Animación de vinilos girando
- [ ] Sonidos retro (opcional)
- [ ] Responsive design para móviles
- [ ] Optimizaciones de rendimiento

---

## Notas
- Cada sprint tiene commits individuales
- Usar GitFlow: `sprint/1-backend-core`, `feature/websocket`, etc.
- Tests al final de cada sprint (si es posible)
