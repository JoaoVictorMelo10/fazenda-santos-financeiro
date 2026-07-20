import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import supabase from './supabaseClient.js'
import { Tela } from './componentes/Tela'
import { Cartao, Selo, EstadoVazio, Esqueleto } from './componentes/UI'
import { moeda, formatarData } from './lib/formato'

function ListaLotes() {
  const [lotes, setLotes] = useState([])
  const [mostrarEncerrados, setMostrarEncerrados] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.from('vw_resumo_lote').select('*').order('data_compra', { ascending: false })
      .then(({ data }) => { setLotes(data || []); setCarregando(false) })
  }, [])

  const ativos = lotes.filter((l) => l.em_aberto > 0)
  const encerrados = lotes.filter((l) => l.em_aberto === 0 && l.total_animais > 0)
  const exibidos = mostrarEncerrados ? encerrados : ativos

  return (
    <Tela titulo="Lotes">
      <div className="flex gap-2 mb-4">
        <BotaoAba ativo={!mostrarEncerrados} onClick={() => setMostrarEncerrados(false)} rotulo={`No pasto (${ativos.length})`} />
        <BotaoAba ativo={mostrarEncerrados} onClick={() => setMostrarEncerrados(true)} rotulo={`Encerrados (${encerrados.length})`} />
      </div>

      {carregando && <div className="space-y-3"><Esqueleto altura="h-24" /><Esqueleto altura="h-24" /></div>}

      {!carregando && exibidos.length === 0 && (
        <EstadoVazio titulo={mostrarEncerrados ? 'Nenhum lote encerrado' : 'Nenhum lote no pasto'}
          descricao={mostrarEncerrados ? 'Lotes com todos os animais vendidos aparecem aqui' : 'Crie um lote ao cadastrar animais'} />
      )}

      <div className="space-y-3 anima-lista">
        {!carregando && exibidos.map((lote) => (
          <Link to={`/lote/${lote.lote_id}`} key={lote.lote_id} className="block">
            <Cartao className="hover:border-primary active:scale-[0.99] transition-all">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-display text-lg font-semibold">{lote.lote_nome}</p>
                  <p className="text-text-soft text-sm">{formatarData(lote.data_compra)}</p>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {lote.em_aberto > 0 && <Selo tipo="aberto">{lote.em_aberto} no pasto</Selo>}
                  {lote.vendidos > 0 && <Selo tipo="vendido">{lote.vendidos} vendidos</Selo>}
                </div>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="text-text-soft">Investido: <span className="text-text numeros">{moeda(lote.investido_total, 0)}</span></span>
                {lote.vendidos > 0 && (
                  <span className="text-text-soft">Lucro: <span className={`numeros font-medium ${lote.lucro_realizado >= 0 ? 'text-primary' : 'text-danger'}`}>{moeda(lote.lucro_realizado, 0)}</span></span>
                )}
              </div>
            </Cartao>
          </Link>
        ))}
      </div>
    </Tela>
  )
}

function BotaoAba({ ativo, onClick, rotulo }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${ativo ? 'border-primary bg-primary-soft text-primary-dark' : 'border-border text-text-soft'}`}>
      {rotulo}
    </button>
  )
}

export default ListaLotes