# PWA (P1) — instalable + notificaciones de descarga

Music 4 All es una PWA instalable con controles de reproducción del SO y
notificaciones push "descarga lista". Implementado en la rama `feat/pwa-p1`.

## Qué incluye

- **Instalable**: `app/manifest.ts` → `/manifest.webmanifest` (display standalone,
  start_url `/dashboard`, theme `#080B0F`, iconos SVG `any` + `maskable`). `apple-icon.svg`
  + `appleWebApp` metadata para iOS.
- **App-shell offline**: `public/sw.js` (service worker). Conservador para una app
  autenticada: **nunca cachea `/api` ni el WebSocket**, navegaciones network-first con
  `public/offline.html` de reserva, estáticos con hash cache-first.
- **Media Session**: `features/player/lib/useMediaSession` — metadatos y controles del
  SO (pantalla de bloqueo, auriculares, teclas de medios) → play/pause/prev/next.
- **Web Push**: notificación al terminar una descarga, por usuario y dispositivo.

## Activar las notificaciones push

El push está **feature-flagged**: desactivado hasta configurar claves VAPID.

1. Generar el par de claves (privada = base64url DER PKCS8; pública = applicationServerKey):

   ```bash
   cd backend && uv run python -c "from py_vapid import Vapid01; from cryptography.hazmat.primitives import serialization; import base64; v=Vapid01(); v.generate_keys(); b=lambda x: base64.urlsafe_b64encode(x).rstrip(b'=').decode(); print('VAPID_PRIVATE_KEY='+b(v.private_key.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))); print('VAPID_PUBLIC_KEY='+b(v.public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)))"
   ```

2. Poner `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y un `VAPID_SUBJECT=mailto:tu@dominio`
   reales en el `.env`. Con eso, `GET /push/public-key` devuelve `enabled: true` y en
   Ajustes aparece el toggle "Download notifications".

3. El usuario activa el toggle → el navegador pide permiso, se suscribe vía el service
   worker y guarda la suscripción en `POST /push/subscribe`. Al completar una descarga,
   el worker envía el push a las suscripciones del dueño.

## Límites y notas

- **El service worker solo se registra en producción** (`NODE_ENV=production`). En
  desarrollo (Next dev / HMR en Docker) no se registra, para no servir código viejo —
  por eso el toggle de notificaciones aparece deshabilitado ("Install the app…").
  Verificar con `pnpm build && pnpm start` (o el target de producción de Docker).
- **iOS**: sin auto-prompt de instalación (Add to Home Screen manual); el push solo
  funciona en la PWA **instalada** (iOS 16.4+) y puede desuscribirse solo. iOS ignora
  los iconos del manifest y usa `apple-icon`.
- **Iconos**: hoy son SVG. Un set PNG 192/512 (mejor soporte iOS/tiendas) es pulido
  posterior; requiere generar binarios desde el SVG.
- **P2 (no hecho)**: reproducción offline de descargas (IndexedDB/Cache) — opcional.
- **CSP**: `worker-src 'self'` y `manifest-src 'self'` añadidos en la CSP de nginx.
