"""Traducción del vocabulario de calidad API/frontend a ``tidalapi.media.Quality``.

El API/frontend usa ``MASTER/HIRES/HIGH/NORMAL`` (ver
``app/modules/jobs/schemas.py`` y ``frontend/.../QualitySelector.tsx``), mientras
que ``tidalapi`` usa un enum con **nombres distintos que NO coinciden 1:1** con los
del API. Este módulo centraliza el mapeo y las decisiones de formato de salida
(FLAC lossless vs M4A/AAC lossy) para que la lógica no se disperse ni se duplique.

| API      | UI                    | tidalapi.Quality   | Valor Tidal        | Formato |
|----------|-----------------------|--------------------|--------------------|---------|
| MASTER   | Master (MQA/Hi-Res)   | hi_res_lossless    | HI_RES_LOSSLESS    | FLAC    |
| HIRES    | Hi-Res 24-bit FLAC    | hi_res_lossless    | HI_RES_LOSSLESS    | FLAC    |
| HIGH     | 16-bit FLAC (CD)      | high_lossless      | LOSSLESS           | FLAC    |
| NORMAL   | AAC 320 kbps          | low_320k           | HIGH               | M4A     |
"""

from __future__ import annotations

from tidalapi.media import Quality

_DEFAULT_API_QUALITY = "MASTER"

#: Vocabulario API → enum de tidalapi. Los nombres no son equivalentes: el
#: "HIGH" del API es el FLAC 16-bit (``high_lossless`` = "LOSSLESS" en Tidal),
#: y el "NORMAL" del API es el AAC 320 (``low_320k`` = "HIGH" en Tidal).
_QUALITY_MAP: dict[str, Quality] = {
    "MASTER": Quality.hi_res_lossless,
    "HIRES": Quality.hi_res_lossless,
    "HIGH": Quality.high_lossless,
    "NORMAL": Quality.low_320k,
}

#: Calidades AAC/M4A (lossy). Se define por exclusión para que cualquier valor
#: desconocido caiga en el lado lossless, coherente con el default de
#: ``resolve_quality`` (``hi_res_lossless``).
_LOSSY_QUALITIES = frozenset({"NORMAL"})


def _normalize(api_quality: str | None) -> str:
    return (api_quality or _DEFAULT_API_QUALITY).upper()


def resolve_quality(api_quality: str | None) -> Quality:
    """Traduce una calidad del API al enum de tidalapi.

    Valores desconocidos o ``None`` caen al default seguro (``hi_res_lossless``).
    """
    return _QUALITY_MAP.get(_normalize(api_quality), Quality.hi_res_lossless)


def is_lossless(api_quality: str | None) -> bool:
    """``True`` si la calidad produce FLAC (lossless); ``False`` para AAC/M4A."""
    return _normalize(api_quality) not in _LOSSY_QUALITIES


def extension_for(api_quality: str | None) -> str:
    """Extensión de archivo destino: ``.flac`` para lossless, ``.m4a`` para lossy."""
    return ".flac" if is_lossless(api_quality) else ".m4a"
