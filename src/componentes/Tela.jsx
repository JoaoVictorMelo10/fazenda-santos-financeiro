import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import BarraInferior from './BarraInferior'

export function Cabecalho({ titulo, voltar }) {
  const navigate = useNavigate()
  return (
    <header className="bg-gradient-to-b from-primary-dark to-primary text-white px-5 pt-6 pb-5 flex items-center gap-3">
      {voltar && (
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-transform">
          <ChevronLeft size={26} />
        </button>
      )}
      <h1 className="font-display text-2xl font-semibold">{titulo}</h1>
    </header>
  )
}

export function Tela({ titulo, voltar, children }) {
  return (
    <div className="min-h-screen bg-bg pb-28">
      <Cabecalho titulo={titulo} voltar={voltar} />
      <main className="max-w-lg mx-auto px-5 py-5 anima-entra">{children}</main>
      <BarraInferior />
    </div>
  )
}
