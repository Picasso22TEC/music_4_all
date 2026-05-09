/**
 * Página de Login
 */
export function LoginPage() {
  return (
    <div className="login-page">
      <h2>Iniciar Sesión</h2>
      <form>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Contraseña" />
        <button type="submit">Login</button>
      </form>
    </div>
  )
}
