# Music 4 All 🎵

Descargador de música desde Tidal con interfaz web moderna y estética neón.

## Estructura del Proyecto

```
music_4_all/
├── backend/          # API FastAPI
├── frontend/         # Interfaz React + Vite
└── docker-compose.yml
```

## Instalación

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m app.main
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Características

- ✨ Autenticación con Tidal
- 🎵 Búsqueda de álbumes y canciones
- ⬇️ Descarga de alta calidad (LOSSLESS)
- 📊 Barra de progreso en tiempo real
- 🎨 Interfaz neón moderna

## Tecnologías

- **Backend**: FastAPI, Python 3.11+
- **Frontend**: React 18, Vite
- **Real-time**: WebSockets

## Licencia

MIT
