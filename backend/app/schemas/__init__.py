"""Compatibilidad para importaciones legacy de schemas."""

from .auth import LoginRequest as LoginRequest
from .auth import TokenResponse as TokenResponse
from .download import DownloadJob as DownloadJob
from .download import DownloadJobStatus as DownloadJobStatus
from .metadata import Album as Album
from .metadata import Track as Track
