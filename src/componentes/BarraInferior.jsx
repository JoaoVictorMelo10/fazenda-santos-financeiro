import { NavLink } from 'react-router-dom'
import { Home, PawPrint, CirclePlus, ChartColumn, Settings } from 'lucide-react'

const itens = [
  { rota: '/painel-principal', rotulo: 'Painel', Icone: Home },
  { rota: '/lista-animais', rotulo: 'Animais', Icone: PawPrint },
  { rota: '/lancamento-custo', rotulo: 'Lançar', Icone: CirclePlus, destaque: true },
  { rota: '/relatorios', rotulo: 'Relatórios', Icone: ChartColumn },
  { rota: '/configuracoes', rotulo: 'Ajustes', Icone: Settings },
]

export default function BarraInferior() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)] z-40">
      <div className="max-w-lg mx-auto flex justify-around items-center px-2 py-2">
        {itens.map(({ rota, rotulo, Icone, destaque }) => (
          <NavLink
            key={rota}
            to={rota}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[64px] transition-colors ${
                isActive && !destaque ? 'text-primary' : 'text-text-soft'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {destaque ? (
                  <span className="bg-primary text-white rounded-full p-3 -mt-6 shadow-lg shadow-primary/30 transition-transform active:scale-95">
                    <Icone size={26} strokeWidth={2.2} />
                  </span>
                ) : (
                  <span className={`transition-transform duration-200 ${isActive ? '-translate-y-0.5 scale-110' : ''}`}>
                    <Icone size={24} strokeWidth={2.2} />
                  </span>
                )}
                <span className="text-xs font-semibold">{rotulo}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
