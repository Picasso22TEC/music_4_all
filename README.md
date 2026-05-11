# Music 4 All 🎵

Descargador de música desde Tidal con interfaz web moderna y estética neón.

## Estructura del Proyecto

```
music_4_all/
├── backend/          # API FastAPI
├── frontend/         # Interfaz React + Vite
├── docs/             # Guias y notas del proyecto
├── tools/            # Utilidades manuales
├── backend/tests/    # Pruebas automatizadas
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

## Flujo de trabajo con ramas

Si trabajas sobre una rama derivada de `main`, mantén `main` como base estable y trae los cambios hacia tu rama:

```bash
git switch tu-rama
git fetch origin
git merge origin/main
```

Si prefieres historial lineal:

```bash
git switch tu-rama
git fetch origin
git rebase origin/main
```

Para verificar que `main` local está alineado con el remoto:

```bash
git switch main
git fetch origin
git status
```

Si `git status` dice que `main` está behind `origin/main`, entonces te falta traer cambios. Si dice `up to date`, estás alineado.

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
