import { useState, useEffect, useCallback } from "react"
import supabase from './supabaseClient.js'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Tela } from './componentes/Tela'
import { Cartao, EstadoVazio, Esqueleto, Campo, Input, Botao, Alerta } from './componentes/UI'
import { moeda, formatarData, removerCorrigidos, rotulosCategoria } from './lib/formato'
import { Pencil } from 'lucide-react'

function TelaCustosRebanho() {
  const { sessao } = useAuth()
  const [custos, setCustos] = useState([])
  const [rateio, setRateio] = useState({}) // custo_id -> { n, porCabeca }
  const [carregando, setCarregando] = useState(true)

  const [corrigindo, setCorrigindo] = useState(null)
  const [novoValor, setNovoValor] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    // custos do rebanho = sem animal e sem lote
    const { data: custosData } = await supabase
      .from('custos')
      .select('*')
      .is('animal_id', null)
      .is('lote_id', null)
      .order('data', { ascending: false })
    setCustos(removerCorrigidos(custosData || []))

    // quantas cabeças cada custo pegou (rateado na data do custo) e quanto ficou por cabeça
    const { data: fatias } = await supabase
      .from('vw_custo_rateado_detalhe')
      .select('custo_id, valor_rateado')
      .eq('tipo', 'rebanho')

    const mapa = {}
    for (const f of fatias || []) {
      if (!mapa[f.custo_id]) mapa[f.custo_id] = { n: 0, porCabeca: Number(f.valor_rateado) }
      mapa[f.custo_id].n += 1
    }
    setRateio(mapa)

    setCarregando(false)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga assíncrona, setState roda após await
  useEffect(() => { carregar() }, [carregar])

  async function salvarCorrecao(evento) {
    evento.preventDefault()
    setErro('')
    if (!novoValor || !justificativa.trim()) {
      setErro('Informe o valor correto e o motivo da correção.')
      return
    }
    const { error } = await supabase.from('custos').insert([{
      animal_id: null,
      lote_id: null,
      categoria: corrigindo.categoria,
      valor: Number(novoValor),
      data: corrigindo.data,
      descricao: corrigindo.descricao,
      lancado_por: sessao?.user?.id,
      custo_original_id: corrigindo.id,
      justificativa: justificativa.trim(),
    }])
    if (error) {
      setErro('Erro ao corrigir: ' + error.message)
      return
    }
    setCorrigindo(null)
    setNovoValor('')
    setJustificativa('')
    carregar()
  }

  return (
    <Tela titulo="Custos do rebanho" voltar>
      <Cartao className="mb-4">
        <p className="text-text-soft text-sm">
          Custos que valem pra fazenda inteira (ex.: sal, vacina no rebanho todo).
          Cada um é dividido entre as cabeças que estavam na fazenda na data do lançamento.
        </p>
      </Cartao>

      {carregando ? (
        <div className="space-y-3"><Esqueleto /><Esqueleto /></div>
      ) : custos.length === 0 ? (
        <Cartao>
          <EstadoVazio
            titulo="Nenhum custo do rebanho ainda"
            descricao="Quando você lançar um custo pra fazenda inteira, ele aparece aqui."
          />
          <Link to="/lancamento-custo" className="mt-1 inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3.5 text-base font-semibold text-white shadow-sm shadow-primary/25 hover:bg-primary-dark active:scale-[0.98] transition-all duration-150">
            Lançar um custo
          </Link>
        </Cartao>
      ) : (
        <Cartao className="divide-y divide-border">
          {custos.map((custo) => {
            const info = rateio[custo.id]
            return (
              <div key={custo.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    {rotulosCategoria[custo.categoria] || custo.categoria}
                    {custo.custo_original_id && <span className="text-warn text-xs font-semibold ml-1.5">corrigido</span>}
                  </p>
                  <p className="text-sm text-text-soft">
                    {formatarData(custo.data)}
                    {info
                      ? ` · dividido entre ${info.n} ${info.n === 1 ? 'cabeça' : 'cabeças'} · ${moeda(info.porCabeca)} cada`
                      : ' · sem cabeças na data (não rateado)'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <p className="font-semibold numeros">{moeda(custo.valor)}</p>
                  <button
                    type="button"
                    onClick={() => { setCorrigindo(custo); setNovoValor(String(custo.valor)); setJustificativa(''); setErro('') }}
                    aria-label="Corrigir este custo"
                    className="p-1.5 text-text-soft rounded-full hover:bg-surface-2"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </Cartao>
      )}

      {corrigindo && (
        <Cartao as="form" onSubmit={salvarCorrecao} className="mt-4 space-y-3 anima-pop border-warn">
          <p className="font-display text-lg font-semibold">
            Corrigir {rotulosCategoria[corrigindo.categoria]} de {formatarData(corrigindo.data)}
          </p>
          <p className="text-text-soft text-sm -mt-2">
            O lançamento original de {moeda(corrigindo.valor)} fica guardado no histórico; este novo valor entra no lugar dele, pro rebanho todo.
          </p>
          <Campo rotulo="Valor correto (R$)" id="novoValorRebanho">
            <Input id="novoValorRebanho" type="number" min="0" step="any" inputMode="decimal" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} />
          </Campo>
          <Campo rotulo="Motivo da correção" id="justRebanho" dica="Ex.: digitei o valor errado">
            <Input id="justRebanho" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
          </Campo>
          {erro && <Alerta tipo="erro">{erro}</Alerta>}
          <div className="flex gap-2">
            <Botao type="submit" className="flex-1">Salvar correção</Botao>
            <Botao type="button" variante="fantasma" onClick={() => setCorrigindo(null)}>Cancelar</Botao>
          </div>
        </Cartao>
      )}
    </Tela>
  )
}

export default TelaCustosRebanho