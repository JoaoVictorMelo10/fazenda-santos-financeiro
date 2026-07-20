import supabase from './supabaseClient.js'
import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Tela } from './componentes/Tela'
import { Cartao, Campo, Input, Select, Botao, Alerta, MarcaFerro } from './componentes/UI'
import { hojeISO, moeda } from './lib/formato'
import { Plus, Check } from 'lucide-react'

function CadastroAnimais() {
  const { sessao } = useAuth()
  const navigate = useNavigate()

  const [ferro, setFerro] = useState('')
  const [data, setData] = useState(hojeISO())
  const [peso, setPeso] = useState('')
  const [valor, setValor] = useState('')
  const [observacao, setObservacao] = useState('')
  const [pesoAlvo, setPesoAlvo] = useState('')

  const [lotes, setLotes] = useState([])
  const [loteSelecionado, setLoteSelecionado] = useState('')
  const [novoLoteNome, setNovoLoteNome] = useState('')
  const [novoLoteValor, setNovoLoteValor] = useState('')
  const [criandoLoteNovo, setCriandoLoteNovo] = useState(false)

  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cadastrados, setCadastrados] = useState([]) // animais criados nesta sessão

  const carregarLotes = useCallback(async () => {
    // Só lotes "vivos": com pelo menos um animal em aberto, ou recém-criados sem animal ainda.
    const { data } = await supabase
      .from('vw_resumo_lote')
      .select('lote_id, lote_nome, valor_arroba_lote, em_aberto, total_animais')
      .order('data_compra', { ascending: false })
    const vivos = (data || []).filter((l) => l.em_aberto > 0 || l.total_animais === 0)
    setLotes(vivos)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga assíncrona, setState roda após await
  useEffect(() => { carregarLotes() }, [carregarLotes])

  const valorDoLote = criandoLoteNovo
    ? (Number(novoLoteValor) || null)
    : (Number(lotes.find((l) => l.lote_id === loteSelecionado)?.valor_arroba_lote) || null)

  const valorEfetivo = valor !== '' ? Number(valor) : valorDoLote
  const valorTotal = (Number(peso) || 0) * (valorEfetivo || 0)

  function limparAnimal() {
    setFerro('')
    setPeso('')
    setValor('')
    setObservacao('')
    setPesoAlvo('')
  }

  async function enviarCadastro(evento) {
    evento.preventDefault()
    setErro('')

    if (!ferro || !data || !peso) {
      setErro('Preencha número do ferro, data e peso.')
      return
    }
    if (!valorEfetivo) {
      setErro('Informe o valor da arroba — no animal ou no lote.')
      return
    }

    setEnviando(true)
    let loteId = loteSelecionado || null
    let loteNome = lotes.find((l) => l.lote_id === loteSelecionado)?.lote_nome || null

    // Cria o lote novo uma vez; depois ele passa a ser o lote selecionado
    if (criandoLoteNovo && novoLoteNome.trim()) {
      const { data: loteCriado, error: erroLote } = await supabase
        .from('lotes')
        .insert([{
          nome: novoLoteNome.trim(),
          data_compra: data,
          valor_arroba_lote: valorDoLote || valorEfetivo,
          criado_por: sessao?.user?.id,
        }])
        .select()
        .single()

      if (erroLote) {
        setErro('Não foi possível criar o lote: ' + erroLote.message)
        setEnviando(false)
        return
      }
      loteId = loteCriado.id
      loteNome = loteCriado.nome
      // Sai do modo "criar" e deixa o lote novo já selecionado pros próximos
      setCriandoLoteNovo(false)
      setNovoLoteNome('')
      setNovoLoteValor('')
      setLoteSelecionado(loteCriado.id)
      await carregarLotes()
    }

    const { error } = await supabase.from('animais').insert([{
      numero_ferro: Number(ferro),
      data_entrada: data,
      peso_entrada_arr: Number(peso),
      valor_arroba_compra: valorEfetivo,
      lote_id: loteId,
      observacao: observacao || null,
      peso_alvo_arr: pesoAlvo ? Number(pesoAlvo) : null,
      criado_por: sessao?.user?.id,
    }])

    setEnviando(false)

    if (error) {
      setErro(error.code === '23505' ? `Já existe um animal com o ferro nº ${ferro}.` : 'Erro ao cadastrar: ' + error.message)
      return
    }

    // Registra na lista da sessão e limpa só os campos do animal — lote e data ficam
    setCadastrados([{ ferro, peso, valor: valorEfetivo, lote: loteNome }, ...cadastrados])
    limparAnimal()
  }

  return (
    <Tela titulo="Cadastrar animal" voltar>
      <form onSubmit={enviarCadastro} className="space-y-4 anima-lista">
        <Cartao className="space-y-4">
          <Campo rotulo="Lote" id="lote" dica={!criandoLoteNovo ? 'Comprou vários juntos? Use o mesmo lote em todos' : undefined}>
            {!criandoLoteNovo ? (
              <div className="flex gap-2">
                <Select id="lote" className="flex-1" value={loteSelecionado} onChange={(e) => setLoteSelecionado(e.target.value)}>
                  <option value="">Sem lote (compra avulsa)</option>
                  {lotes.map((lote) => (
                    <option key={lote.lote_id} value={lote.lote_id}>
                      {lote.lote_nome}{lote.em_aberto > 0 ? ` (${lote.em_aberto} no pasto)` : ' (novo)'}
                    </option>
                  ))}
                </Select>
                <Botao type="button" variante="secundaria" onClick={() => setCriandoLoteNovo(true)} aria-label="Criar novo lote">
                  <Plus size={20} />
                </Botao>
              </div>
            ) : (
              <div className="bg-surface-2 rounded-xl p-4 space-y-4">
                <Campo rotulo="Nome do novo lote" id="novoLoteNome">
                  <Input id="novoLoteNome" value={novoLoteNome} onChange={(e) => setNovoLoteNome(e.target.value)} placeholder="Ex.: Compra 19/07" />
                </Campo>
                <Campo rotulo="Valor por @ do lote (R$)" id="novoLoteValor" dica="Todos os animais do lote entram com esse valor">
                  <Input id="novoLoteValor" type="number" step="any" inputMode="decimal" value={novoLoteValor} onChange={(e) => setNovoLoteValor(e.target.value)} />
                </Campo>
                <Botao type="button" variante="fantasma" tamanho="pequeno" onClick={() => { setCriandoLoteNovo(false); setNovoLoteNome(''); setNovoLoteValor('') }}>
                  Cancelar novo lote
                </Botao>
              </div>
            )}
          </Campo>
        </Cartao>

        <Cartao className="space-y-4">
          <Campo rotulo="Número do ferro" id="ferro" dica="O número marcado no couro">
            <Input id="ferro" type="number" inputMode="numeric" value={ferro} onChange={(e) => setFerro(e.target.value)} required />
          </Campo>

          <Campo rotulo="Data de entrada" id="data" dica="Já vem com hoje — mude só se for outro dia">
            <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Peso (arrobas)" id="peso">
              <Input id="peso" type="number" step="any" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} required />
            </Campo>
            <Campo rotulo="Valor por @ (R$)" id="valor" dica={valor === '' && valorDoLote ? `Vazio = usa o do lote (${moeda(valorDoLote)})` : undefined}>
              <Input id="valor" type="number" step="any" inputMode="decimal" value={valor} placeholder={valorDoLote ? String(valorDoLote) : ''} onChange={(e) => setValor(e.target.value)} />
            </Campo>
          </div>

          {valorTotal > 0 && (
            <div className="bg-surface-2 rounded-xl px-4 py-3 flex justify-between items-center anima-pop">
              <span className="text-text-soft font-medium">Valor de compra</span>
              <span className="font-display text-xl font-semibold numeros">{moeda(valorTotal)}</span>
            </div>
          )}
        </Cartao>

        <Cartao className="space-y-4">
          <Campo rotulo="Observação" id="observacao" dica="Opcional">
            <Input id="observacao" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </Campo>
          <Campo rotulo="Peso alvo de venda (@)" id="pesoAlvo" dica="Opcional — com ele a projeção de lucro já sai pronta">
            <Input id="pesoAlvo" type="number" step="any" inputMode="decimal" value={pesoAlvo} onChange={(e) => setPesoAlvo(e.target.value)} />
          </Campo>
        </Cartao>

        {erro && <Alerta tipo="erro">{erro}</Alerta>}

        <Botao type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Salvando...' : (cadastrados.length > 0 ? 'Cadastrar mais um' : 'Cadastrar animal')}
        </Botao>
      </form>

      {cadastrados.length > 0 && (
        <div className="mt-6 anima-entra">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-primary-soft text-primary rounded-full p-1.5"><Check size={18} /></span>
            <p className="font-display text-lg font-semibold">
              {cadastrados.length} cadastrado{cadastrados.length > 1 ? 's' : ''} agora
            </p>
          </div>
          <div className="space-y-2">
            {cadastrados.map((a, i) => (
              <Link to={`/animal/${a.ferro}`} key={i} className="block">
                <Cartao className="flex items-center gap-3 py-3 hover:border-primary transition-colors">
                  <MarcaFerro numero={a.ferro} tamanho="pequeno" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">Ferro {a.ferro} · {a.peso}@</p>
                    <p className="text-sm text-text-soft truncate">{a.lote || 'Compra avulsa'} · {moeda(a.valor)}/@</p>
                  </div>
                </Cartao>
              </Link>
            ))}
          </div>
          <Botao variante="secundaria" className="w-full mt-4" onClick={() => navigate('/lista-animais')}>
            Concluir e ver todos os animais
          </Botao>
        </div>
      )}
    </Tela>
  )
}

export default CadastroAnimais