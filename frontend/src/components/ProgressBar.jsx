/**
 * Barra de progreso animada con efecto neón
 */
export function ProgressBar({ progress, animated = true }) {
  return (
    <div className="progress-container">
      <div className="progress-bar" style={{ width: `${progress}%` }}>
        {animated && <div className="progress-glow"></div>}
      </div>
      <span className="progress-text">{progress}%</span>
    </div>
  )
}
