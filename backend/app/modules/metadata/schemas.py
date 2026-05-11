"""Esquemas del módulo de metadatos."""

from typing import List
from pydantic import BaseModel


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
