/**
 * Tarjeta de álbum con estilo neón
 */
export function VinylCard({ album, onSelect }) {
  return (
    <div className="vinyl-card" onClick={() => onSelect?.(album)}>
      <div className="vinyl-cover">
        <img src={album.image} alt={album.title} />
      </div>
      <div className="vinyl-info">
        <h3>{album.title}</h3>
        <p>{album.artist}</p>
      </div>
    </div>
  )
}
