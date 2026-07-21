import { useState, useEffect, useCallback, useMemo } from "react"
import supabase from './supabaseClient.js'
import { useAuth } from './AuthContext'
import { Tela } from './componentes/Tela'
import { Cartao, EstadoVazio, Esqueleto, Campo, Input, Botao, Alerta } from './componentes/UI'
import { moeda, formatarData, removerCorrigidos, rotulosCategoria } from './lib/formato'

const CATEGORIAS = Object.keys(rotulosCategoria) // racao, sal_mineral, veterinario, vacina, transporte, outro

function alvoInfo(custo) {
  if (custo.animais) return { texto: `Ferro ${custo.animais.numero_ferro}`, escopo: 'este animal' }
  if (custo.lotes) return { texto: `Lote ${custo.lotes.nome}`, escopo: 'o lote todo' }
  return { texto: 'Rebanho todo', escopo: 'o rebanho todo' }
}

function TelaCustos() {
  const { sessao } = useAuth()
  const [custos, setCustos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState('todos')

  const [corrigindo, setCorrigindo] = useState(null)
  const [novoValor, setNovoValor] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    // resolve o alvo (ferro do animal / nome do lote) no mesmo select
    const { data } = await supabase
      .from('custos')
      .select('*, animais(numero_ferro), lotes(nome)')
      .order('data', { ascending: false })
    setCustos(removerCorrigidos(data || []))
    setCarregando(false)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga assíncrona, setState roda após await
  useEffect(() => { carregar() }, [carregar])

  const filtrados = useMemo(
    () => (filtro === 'todos' ? custos : custos.filter((c) => c.categoria === filtro)),
    [custos, filtro]
  )
  const total = useMemo(
    () => filtrados.reduce((soma, c) => soma + Number(c.valor || 0), 0),
    [filtrados]
  )

  function abrirCorrecao(custo) {
    setCorrigindo(custo)
    setNovoValor(String(custo.valor))
    setJustificativa('')
    setErro('')
  }

  async function salvarCorrecao(evento) {
    evento.preventDefault()
    setErro('')
    if (!novoValor || !justificativa.trim()) {
      setErro('Informe o valor correto e o motivo da correção.')
      return
    }
    const { error } = await supabase.from('custos').insert([{
      animal_id: corrigindo.animal_id,
      lote_id: corrigindo.lote_id,
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
    <Tela titulo="Custos">
      {/* filtro por categoria */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 mb-3">
        <ChipFiltro ativo={filtro === 'todos'} onClick={() => setFiltro('todos')} rotulo="Todos" />
        {CATEGORIAS.map((cat) => (
          <ChipFiltro key={cat} ativo={filtro === cat} onClick={() => setFiltro(cat)} rotulo={rotulosCategoria[cat]} />
        ))}
      </div>

      <Cartao className="mb-4 flex justify-between items-center">
        <span className="text-text-soft">
          {filtro === 'todos' ? 'Total gasto' : rotulosCategoria[filtro]}
          <span className="text-text-soft/70"> · {filtrados.length} {filtrados.length === 1 ? 'lançamento' : 'lançamentos'}</span>
        </span>
        <span className="font-display text-xl font-semibold numeros">{moeda(total)}</span>
      </Cartao>

      {carregando ? (
        <div className="space-y-3"><Esqueleto /><Esqueleto /><Esqueleto /></div>
      ) : filtrados.length === 0 ? (
        <Cartao>
          <EstadoVazio
            titulo="Nenhum custo aqui"
            descricao={filtro === 'todos' ? 'Quando você lançar um custo, ele aparece nesta lista.' : 'Nenhum custo nessa categoria ainda.'}
          />
        </Cartao>
      ) : (
        <Cartao className="divide-y divide-border">
          {filtrados.map((custo) => {
            const alvo = alvoInfo(custo)
            return (
              <button
                key={custo.id}
                type="button"
                onClick={() => abrirCorrecao(custo)}
                className="w-full py-2.5 first:pt-0 last:pb-0 flex justify-between items-center gap-2 text-left hover:bg-surface-2/50 -mx-1 px-1 rounded-lg transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {rotulosCategoria[custo.categoria] || custo.categoria}
                    {custo.custo_original_id && <span className="text-warn text-xs font-semibold ml-1.5">corrigido</span>}
                  </p>
                  <p className="text-sm text-text-soft truncate">
                    {formatarData(custo.data)} · {alvo.texto}
                  </p>
                </div>
                <p className="font-semibold numeros shrink-0">{moeda(custo.valor)}</p>
              </button>
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
            O lançamento original de {moeda(corrigindo.valor)} fica guardado no histórico; este novo valor entra no lugar dele — vale pra {alvoInfo(corrigindo).escopo}.
          </p>
          <Campo rotulo="Valor correto (R$)" id="novoValorCusto">
            <Input id="novoValorCusto" type="number" min="0" step="any" inputMode="decimal" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} />
          </Campo>
          <Campo rotulo="Motivo da correção" id="justCusto" dica="Ex.: digitei o valor errado">
            <Input id="justCusto" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
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

function ChipFiltro({ ativo, onClick, rotulo }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
        ativo ? 'bg-primary text-white border-primary' : 'bg-surface text-text-soft border-border hover:border-primary'
      }`}
    >
      {rotulo}
    </button>
  )
}

export default TelaCustos