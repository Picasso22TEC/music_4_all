/**
 * Botón de descarga
 */
export function DownloadButton({ onClick, disabled = false, loading = false }) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled || loading}
      className="download-button"
    >
      {loading ? '⟳ Descargando...' : '⬇ Descargar'}
    </button>
  )
}
