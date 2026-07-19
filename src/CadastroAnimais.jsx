import supabase from './supabaseClient.js'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Tela } from './componentes/Tela'
import { Cartao, Campo, Input, Select, Botao, Alerta } from './componentes/UI'
import { hojeISO, moeda } from './lib/formato'
import { Plus } from 'lucide-react'

function CadastroAnimais() {
  const { sessao } = useAuth()
  const [ferro, setFerro] = useState('')
  const [data, setData] = useState(hojeISO())
  const [peso, setPeso] = useState('')
  const [valor, setValor] = useState('')

  const [lotes, setLotes] = useState([])
  const [loteSelecionado, setLoteSelecionado] = useState('')
  const [novoLoteNome, setNovoLoteNome] = useState('')
  const [novoLoteValor, setNovoLoteValor] = useState('')
  const [criandoLoteNovo, setCriandoLoteNovo] = useState(false)

  const [observacao, setObservacao] = useState('')
  const [pesoAlvo, setPesoAlvo] = useState('')

  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('lotes').select('id, nome, valor_arroba_lote').order('nome').then(({ data }) => setLotes(data || []))
  }, [])

  // Escolheu um lote que já tem valor por arroba definido? Preenche sozinho.
  function escolherLote(id) {
    setLoteSelecionado(id)
    const lote = lotes.find((l) => l.id === id)
    if (lote?.valor_arroba_lote && !valor) setValor(String(lote.valor_arroba_lote))
  }

  const valorTotal = (Number(peso) || 0) * (Number(valor) || 0)

  async function enviarCadastro(evento) {
    evento.preventDefault()
    setErro('')

    if (!ferro || !data || !peso || !valor) {
      setErro('Preencha número do ferro, data, peso e valor da arroba.')
      return
    }

    setEnviando(true)

    let loteId = loteSelecionado || null

    if (criandoLoteNovo && novoLoteNome.trim()) {
      const { data: loteCriado, error: erroLote } = await supabase
        .from('lotes')
        .insert([{
          nome: novoLoteNome.trim(),
          data_compra: data,
          valor_arroba_lote: novoLoteValor ? Number(novoLoteValor) : (valor ? Number(valor) : null),
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
      setLotes([...lotes, loteCriado])
    }

    const { error } = await supabase.from('animais').insert([{
      numero_ferro: Number(ferro),
      data_entrada: data,
      peso_entrada_arr: Number(peso),
      valor_arroba_compra: Number(valor),
      lote_id: loteId,
      observacao: observacao || null,
      peso_alvo_arr: pesoAlvo ? Number(pesoAlvo) : null,
      criado_por: sessao?.user?.id,
    }])

    setEnviando(false)

    if (error) {
      if (error.code === '23505') {
        setErro(`Já existe um animal cadastrado com o ferro nº ${ferro}.`)
      } else {
        setErro('Erro ao cadastrar: ' + error.message)
      }
      return
    }

    navigate(`/animal/${ferro}`)
  }

  return (
    <Tela titulo="Cadastrar animal" voltar>
      <form onSubmit={enviarCadastro} className="space-y-4 anima-lista">
        <Cartao className="space-y-4">
          <Campo rotulo="Número do ferro" id="ferro" dica="O número marcado no couro">
            <Input id="ferro" type="number" inputMode="numeric" value={ferro} onChange={(e) => setFerro(e.target.value)} required />
          </Campo>

          <Campo rotulo="Data de entrada" id="data" dica="Já vem com a data de hoje — mude só se for outro dia">
            <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Peso (arrobas)" id="peso">
              <Input id="peso" type="number" step="0.01" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} required />
            </Campo>
            <Campo rotulo="Valor por @ (R$)" id="valor">
              <Input id="valor" type="number" step="0.01" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} required />
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
          <Campo rotulo="Lote" id="lote" dica="Comprou vários juntos? Coloque no mesmo lote">
            {!criandoLoteNovo ? (
              <div className="flex gap-2">
                <Select id="lote" className="flex-1" value={loteSelecionado} onChange={(e) => escolherLote(e.target.value)}>
                  <option value="">Sem lote (compra avulsa)</option>
                  {lotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.nome}</option>)}
                </Select>
                <Botao type="button" variante="secundaria" onClick={() => setCriandoLoteNovo(true)} aria-label="Criar novo lote">
                  <Plus size={20} />
                </Botao>
              </div>
            ) : (
              <div className="space-y-2">
                <Input placeholder="Nome do novo lote" value={novoLoteNome} onChange={(e) => setNovoLoteNome(e.target.value)} />
                <div className="flex gap-2">
                  <Input placeholder="Valor por @ do lote (opcional)" type="number" step="0.01" inputMode="decimal" value={novoLoteValor} onChange={(e) => setNovoLoteValor(e.target.value)} />
                  <Botao type="button" variante="fantasma" onClick={() => { setCriandoLoteNovo(false); setNovoLoteNome(''); setNovoLoteValor('') }}>
                    Cancelar
                  </Botao>
                </div>
              </div>
            )}
          </Campo>

          <Campo rotulo="Observação" id="observacao" dica="Opcional">
            <Input id="observacao" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </Campo>
        </Cartao>

        <Cartao className="space-y-4">
          <p className="font-display text-lg font-semibold -mb-1">Meta de venda</p>
          <p className="text-text-soft text-sm -mt-3">Opcional. Se preencher, a projeção de lucro já usa esse peso como alvo.</p>

          <Campo rotulo="Peso alvo (@)" id="pesoAlvo">
            <Input id="pesoAlvo" type="number" step="0.01" inputMode="decimal" value={pesoAlvo} onChange={(e) => setPesoAlvo(e.target.value)} />
          </Campo>
        </Cartao>

        {erro && <Alerta tipo="erro">{erro}</Alerta>}

        <Botao type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Salvando...' : 'Cadastrar animal'}
        </Botao>
      </form>
    </Tela>
  )
}

export default CadastroAnimais
