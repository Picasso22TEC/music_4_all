# Referencia de espectrogramas FLAC en Spek

Guía de lectura de espectrogramas (Spek) para **verificar la calidad real** de un
archivo descargado desde Tidal y detectar falsos "hi-res" (upsampling o transcodes
lossy re-empaquetados como FLAC). Es el material de apoyo de la rama
`feat/download-quality-verification`.

---

## 1. Qué muestra un espectrograma

| Eje | Significado |
|---|---|
| Horizontal (X) | Tiempo (duración de la pista). |
| Vertical (Y) | Frecuencia, de 0 Hz arriba hasta el **techo de Nyquist**. |
| Color | Amplitud/energía en dB: oscuro = silencio, brillante (verde→amarillo→rojo/blanco) = fuerte. |

El dato clave es el **techo de frecuencia** = `sample_rate / 2` (frecuencia de
Nyquist). Es el límite físico de lo que un sample rate puede representar y define
la altura del gráfico en Spek.

| Sample rate | Techo (Nyquist) en Spek |
|---|---|
| 44.1 kHz | 22.05 kHz |
| 48 kHz | 24 kHz |
| 88.2 kHz | 44.1 kHz |
| 96 kHz | 48 kHz |
| 176.4 kHz | 88.2 kHz |
| 192 kHz | 96 kHz |

---

## 2. Cómo se ve cada calidad objetivo

Las 6 resoluciones que estamos muestreando (`44.1/16`, `44.1/24`, `48/24`,
`88.2/24`, `96/24`, `192/24`):

### 44.1 kHz / 16 bit (CD, tier HIGH/LOSSLESS)
- Techo a **22.05 kHz**. El contenido musical sube y se desvanece de forma
  natural hacia el techo; **no** hay un corte plano por debajo de ~20 kHz.
- Es la línea base "lossless real". Un MP3/AAC se distingue de esto por un
  **muro** (ver sección 3).

### 44.1 kHz / 24 bit (hi-res a sample rate de CD)
- **Idéntico en frecuencia** al 44.1/16: mismo techo de 22.05 kHz.
- La única diferencia es el **bit depth** (24 vs 16 bit), que en Spek se
  traduce en un **suelo de ruido más bajo** (fondo más limpio/oscuro en los
  pasajes silenciosos). Es **sutil y a menudo no distinguible a simple vista**.
- **Conclusión práctica:** Spek NO permite separar 44.1/24 de 44.1/16 solo por
  la imagen. Para estos dos hay que confiar en la cabecera del archivo
  (metadatos: lo que reporta `mutagen` / `_read_audio_info`).

### 48 kHz / 24 bit
- Techo a **24 kHz**. Contenido natural hasta cerca del techo.
- Frecuente en producciones modernas y material derivado de Atmos/vídeo.

### 88.2 kHz / 24 bit (rara)
- Techo a **44.1 kHz**. Aquí **ya se puede verificar hi-res visualmente**:
  debe haber energía real (aunque sea de bajo nivel: armónicos, aire, ruido de
  cinta) **por encima de los 22 kHz**, extendiéndose hacia el techo.
- Si por encima de ~22 kHz hay una **banda muerta** (negra/vacía), el archivo es
  un CD (o lossy) **subido de muestreo** y etiquetado como 88.2 — falso hi-res.

### 96 kHz / 24 bit
- Techo a **48 kHz**. Debe verse contenido real más allá de 22-24 kHz.
- El sample rate más común en catálogo hi-res.

### 192 kHz / 24 bit
- Techo a **96 kHz**. La mayor parte de la energía real de la música vive por
  debajo de ~30-40 kHz; por encima suele quedar ruido de muy bajo nivel y algo
  de contenido ultrasónico. **No** es normal ver energía fuerte hasta 96 kHz.
- Un 192 kHz legítimo muestra un desvanecimiento gradual, no un corte abrupto.

---

## 3. Cómo detectar un FALSO hi-res / transcode

El objetivo de la verificación. Señales de fraude:

1. **Muro (brick-wall) lossy.** Un corte horizontal duro y plano, con vacío
   negro por encima:
   - ~16 kHz -> MP3 128 kbps.
   - ~19 kHz -> AAC ~256 kbps.
   - ~20-20.5 kHz -> MP3 320 kbps.
   Si un archivo dice ser FLAC pero tiene un muro a 16-20 kHz, es un lossy
   re-empaquetado, no lossless.

2. **Banda muerta ultrasónica (upsampling).** El archivo declara 96/176.4/192
   kHz (techo alto en Spek) pero **el contenido real se corta en ~22 kHz** y todo
   lo de arriba es negro. Es un CD subido de muestreo: ocupa el tamaño de un
   hi-res sin la información. Este es el fraude que solo se ve con sample rate
   >= 88.2 kHz (por eso priorizamos esas muestras).

3. **Línea/plano ruidoso artificial.** A veces el upsampling deja una fina línea
   de ruido de dither justo sobre el corte; sigue siendo delator: no es
   contenido musical.

**Regla de oro:** hi-res **auténtico** = el contenido se desvanece de forma
gradual hacia el techo. **Falso** = muro duro + vacío por encima, o techo alto
con banda muerta a partir de ~22 kHz.

---

## 4. Límite importante de esta verificación

- El **sample rate** (techo) SÍ es verificable visualmente en Spek **si es
  >= 88.2 kHz** (hay margen sobre los 22 kHz para juzgar si el contenido es real).
- El **bit depth** (16 vs 24) **no** es fiablemente verificable a ojo; se confía
  en la cabecera FLAC.
- Para `44.1/16` y `44.1/24`, las imágenes de Spek son prácticamente iguales;
  la distinción es solo por metadatos.

Por eso el pipeline combina **dos fuentes de verdad**:
1. Spek (imagen) -> valida que el sample rate declarado tiene contenido real.
2. `mutagen` / `_read_audio_info` (cabecera FLAC) -> `(sample_rate, bits_per_sample)`
   reales del archivo, que es lo que la app registra como calidad.

---

## 5. Ajustes recomendados en Spek

- Abrir el `.flac` directamente (arrastrar al programa).
- Comprobar que el techo del eje Y coincide con el Nyquist esperado del sample
  rate declarado (tabla de la sección 1). Si el techo dibujado es más alto que
  el contenido real -> sospechar upsampling.
- Mirar los **últimos kHz** antes del techo: ahí se decide real vs falso.
