"""Esquemas para metadatos de álbumes y canciones"""

from pydantic import BaseModel
from typing import List

class Track(BaseModel):
    id: str
    title: str
    artist: str
    album: str
    duration: int

class Album(BaseModel):
    id: str
    title: str
    artist: str
    tracks: List[Track] = []
