import { useState, useEffect } from "react"
import supabase from "./supabaseClient"
import { Link } from "react-router-dom"
import { useAuth } from "./AuthContext"
import BarraInferior from "./componentes/BarraInferior"
import { Cartao, EstadoVazio, Esqueleto } from "./componentes/UI"
import { moeda, removerCorrigidos, rotulosCategoria } from "./lib/formato"
import { buscarPrecoArroba } from "./lib/preco"
import { LogOut, WifiOff, PawPrint, ClipboardPlus, Handshake, TrendingUp, ChartColumn } from "lucide-react"

// Premissa da projeção do rebanho: ganho de 1@ por mês, limitado ao peso
// alvo do animal (ou a 12 meses de ganho, pra quem não tem alvo definido).
const GANHO_ARROBA_MES = 1
const TETO_MESES_SEM_ALVO = 12

function PainelPrincipal() {
  const { perfil, sessao, pendencias, logout } = useAuth()

  const [carregando, setCarregando] = useState(true)
  const [resumo, setResumo] = useState({ cabecas: 0, investido: 0, diasMedios: 0, pesoEstimado: 0 })
  const [ultimosCustos, setUltimosCustos] = useState([])
  const [ultimasVendas, setUltimasVendas] = useState([])
  const [nomes, setNomes] = useState({})
  const [arroba, setArroba] = useState(null)

  useEffect(() => {
    async function carregar() {
      const { data: emAberto } = await supabase
        .from('vw_animais_em_aberto')
        .select('custo_acumulado, valor_total_compra, dias_na_fazenda, peso_entrada_arr, peso_alvo_arr')

      const lista = emAberto || []
      const investido = lista.reduce((soma, a) => soma + Number(a.custo_acumulado) + Number(a.valor_total_compra), 0)
      const diasMedios = lista.length
        ? Math.round(lista.reduce((soma, a) => soma + Number(a.dias_na_fazenda), 0) / lista.length)
        : 0

      // Peso estimado do rebanho hoje: entrada + ganho suposto por mês,
      // limitado ao alvo de cada animal (ou a um teto pra quem não tem alvo)
      const pesoEstimado = lista.reduce((soma, a) => {
        const meses = Number(a.dias_na_fazenda) / 30.44
        const entrada = Number(a.peso_entrada_arr)
        const alvo = Number(a.peso_alvo_arr) || null
        const teto = alvo ?? entrada + GANHO_ARROBA_MES * TETO_MESES_SEM_ALVO
        return soma + Math.min(entrada + GANHO_ARROBA_MES * meses, teto)
      }, 0)

      setResumo({ cabecas: lista.length, investido, diasMedios, pesoEstimado })

      const { data: perfis } = await supabase.from('perfis').select('id, nome')
      const mapa = {}
      for (const p of perfis || []) mapa[p.id] = p.nome?.split(' ')[0]
      setNomes(mapa)

      const { data: custos } = await supabase
        .from('custos')
        .select('id, custo_original_id, categoria, valor, lancado_por, animais(numero_ferro), lotes(nome)')
        .order('lancado_em', { ascending: false })
        .limit(12)
      setUltimosCustos(removerCorrigidos(custos || []).slice(0, 4))

      const { data: vendas } = await supabase
        .from('vendas')
        .select('id, venda_original_id, peso_saida_arr, valor_total_venda, lancado_por, animais(numero_ferro)')
        .order('lancado_em', { ascending: false })
        .limit(8)
      setUltimasVendas(removerCorrigidos(vendas || [], 'venda_original_id').slice(0, 4))

      setCarregando(false)
    }
    carregar()

    buscarPrecoArroba().then(setArroba)
  }, [])

  const primeiroNome =
    perfil?.nome?.split(' ')[0] ||
    sessao?.user?.user_metadata?.nome?.split(' ')[0] ||
    sessao?.user?.email?.split('@')[0] ||
    ''

  const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  // Projeção do rebanho: quanto o gado vale hoje contra o que já foi gasto
  const precoArroba = Number(arroba?.preco) || null
  const valorRebanho = precoArroba ? resumo.pesoEstimado * precoArroba : null
  const saldoRebanho = valorRebanho !== null ? valorRebanho - resumo.investido : null

  return (
    <div className="min-h-screen bg-bg pb-28">
      <header className="bg-gradient-to-b from-primary-dark to-primary text-white px-5 pt-6 pb-10 rounded-b-3xl">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm font-semibold capitalize">{dataHoje}</p>
              <h1 className="font-display text-2xl font-semibold">Olá, {primeiroNome}</h1>
            </div>
            <button onClick={logout} aria-label="Sair da conta" className="p-2.5 rounded-full hover:bg-white/10 active:scale-95 transition-transform">
              <LogOut size={22} />
            </button>
          </div>

          {arroba?.preco && (
            <div className="mt-3 inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-semibold anima-pop">
              <TrendingUp size={16} />
              Arroba hoje: {moeda(arroba.preco)}
              <span className="text-white/60 font-normal">{arroba.rotulo || 'CEPEA'}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 -mt-6 anima-lista">
        {pendencias > 0 && (
          <div className="bg-warn-soft text-warn rounded-2xl px-4 py-3 mb-4 flex items-center gap-2 font-medium">
            <WifiOff size={20} />
            {pendencias} lançamento{pendencias > 1 ? 's' : ''} esperando internet pra sincronizar
          </div>
        )}

        {carregando ? (
          <div className="space-y-3 mb-5">
            <Esqueleto altura="h-28" />
            <div className="grid grid-cols-2 gap-3">
              <Esqueleto altura="h-24" />
              <Esqueleto altura="h-24" />
            </div>
          </div>
        ) : (
          <>
            {resumo.cabecas > 0 && (
              <Cartao className="mb-3">
                <p className="font-display text-lg font-semibold mb-2">Projeção do rebanho</p>
                {saldoRebanho !== null ? (
                  <>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-text-soft text-sm">Se vendesse tudo hoje</p>
                        <p className={`font-display text-3xl font-semibold numeros ${saldoRebanho >= 0 ? 'text-primary' : 'text-danger'}`}>
                          {saldoRebanho >= 0 ? '+' : ''}{moeda(saldoRebanho, 0)}
                        </p>
                      </div>
                      <p className={`font-semibold text-sm mb-1 ${saldoRebanho >= 0 ? 'text-primary' : 'text-danger'}`}>
                        {saldoRebanho >= 0 ? 'ganhando' : 'perdendo'}
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-text-soft">Rebanho vale hoje (~{resumo.pesoEstimado.toFixed(0)}@)</span><span className="numeros font-medium">{moeda(valorRebanho, 0)}</span></div>
                      <div className="flex justify-between"><span className="text-text-soft">Já investido (compra + custos)</span><span className="numeros font-medium">{moeda(resumo.investido, 0)}</span></div>
                    </div>
                    <p className="text-xs text-text-soft mt-2">
                      Estimativa: arroba de hoje ({arroba?.rotulo || 'CEPEA'}) e ganho de {GANHO_ARROBA_MES}@ por mês desde a entrada de cada animal.
                    </p>
                  </>
                ) : (
                  <p className="text-text-soft text-sm">
                    Sem o preço da arroba de hoje não dá pra estimar o valor do rebanho. O preço vem sozinho quando o backend estiver ligado.
                  </p>
                )}
              </Cartao>
            )}

            <div className="grid grid-cols-2 gap-3 mb-5">
              <Cartao className="text-center">
                <p className="text-3xl font-display font-semibold numeros">{resumo.cabecas}</p>
                <p className="text-text-soft text-sm font-medium mt-1">cabeças em aberto</p>
              </Cartao>
              <Cartao className="text-center">
                <p className="text-2xl font-display font-semibold numeros">{moeda(resumo.investido, 0)}</p>
                <p className="text-text-soft text-sm font-medium mt-1">investido no rebanho</p>
                <p className="text-text-soft/80 text-xs mt-0.5">compra + custos · {resumo.diasMedios} dias em média</p>
              </Cartao>
            </div>
          </>
        )}

        <div className="grid grid-cols-4 gap-2 mb-6">
          <BotaoAtalho to="/cadastro-animais" Icone={PawPrint} rotulo="Cadastrar" />
          <BotaoAtalho to="/registro-venda" Icone={Handshake} rotulo="Vender" />
          <BotaoAtalho to="/lancamento-custo" Icone={ClipboardPlus} rotulo="Custo" />
          <BotaoAtalho to="/relatorios" Icone={ChartColumn} rotulo="Relatórios" />
        </div>

        <h2 className="font-display text-lg font-semibold mb-2">Últimos custos</h2>
        <Cartao className="mb-5 divide-y divide-border">
          {carregando && <Esqueleto altura="h-16" />}
          {!carregando && ultimosCustos.map((custo) => (
            <div key={custo.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-center">
              <div>
                <p className="font-medium">{rotulosCategoria[custo.categoria] || custo.categoria}</p>
                <p className="text-sm text-text-soft">
                  {custo.animais?.numero_ferro ? `Ferro ${custo.animais.numero_ferro}` : custo.lotes?.nome}
                  {nomes[custo.lancado_por] ? ` · por ${nomes[custo.lancado_por]}` : ''}
                </p>
              </div>
              <p className="font-semibold numeros">{moeda(custo.valor)}</p>
            </div>
          ))}
          {!carregando && ultimosCustos.length === 0 && <EstadoVazio titulo="Nenhum custo ainda" descricao="Os lançamentos aparecem aqui" />}
        </Cartao>

        <h2 className="font-display text-lg font-semibold mb-2">Últimas vendas</h2>
        <Cartao className="divide-y divide-border">
          {carregando && <Esqueleto altura="h-12" />}
          {!carregando && ultimasVendas.map((venda) => (
            <div key={venda.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-center">
              <p className="font-medium">
                Ferro {venda.animais?.numero_ferro} · {venda.peso_saida_arr}@
                {nomes[venda.lancado_por] ? <span className="text-text-soft text-sm"> · por {nomes[venda.lancado_por]}</span> : null}
              </p>
              <p className="font-semibold numeros text-primary">{moeda(venda.valor_total_venda)}</p>
            </div>
          ))}
          {!carregando && ultimasVendas.length === 0 && <EstadoVazio titulo="Nenhuma venda ainda" descricao="As vendas aparecem aqui" />}
        </Cartao>
      </main>

      <BarraInferior />
    </div>
  )
}

function BotaoAtalho({ to, Icone, rotulo }) {
  return (
    <Link to={to} className="bg-surface border border-border rounded-2xl py-3 flex flex-col items-center gap-1.5 hover:border-primary active:scale-[0.97] transition-all duration-150 shadow-[0_1px_2px_rgba(29,34,28,0.04)]">
      <span className="bg-primary-soft text-primary rounded-full p-2">
        <Icone size={20} strokeWidth={2.2} />
      </span>
      <span className="text-xs font-semibold text-center leading-tight">{rotulo}</span>
    </Link>
  )
}

export default PainelPrincipal