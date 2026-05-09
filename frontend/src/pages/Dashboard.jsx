/**
 * Panel principal de la aplicación
 */
export function Dashboard() {
  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      <div className="search-bar">
        <input type="text" placeholder="Buscar álbumes o canciones..." />
      </div>
      <div className="content">
        {/* Componentes de búsqueda y descarga */}
      </div>
    </div>
  )
}
