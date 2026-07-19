import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function RotaProtegida({ children }) {
  const { sessao } = useAuth()

  if (sessao === undefined) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Carregando...</div>
  }

  if (sessao === null) {
    return <Navigate to="/" replace />
  }

  return children
}
