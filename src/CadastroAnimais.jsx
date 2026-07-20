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

  // Valor da arroba que vem do lote (novo ou existente), se houver
  const valorDoLote = criandoLoteNovo
    ? (Number(novoLoteValor) || null)
    : (Number(lotes.find((l) => l.id === loteSelecionado)?.valor_arroba_lote) || null)

  // O animal usa o próprio valor se digitado; senão, herda o do lote
  const valorEfetivo = valor !== '' ? Number(valor) : valorDoLote

  const valorTotal = (Number(peso) || 0) * (valorEfetivo || 0)

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
      setLotes([...lotes, loteCriado])
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
          <Campo rotulo="Lote" id="lote" dica={!criandoLoteNovo ? 'Comprou vários juntos? Coloque no mesmo lote' : undefined}>
            {!criandoLoteNovo ? (
              <div className="flex gap-2">
                <Select id="lote" className="flex-1" value={loteSelecionado} onChange={(e) => setLoteSelecionado(e.target.value)}>
                  <option value="">Sem lote (compra avulsa)</option>
                  {lotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.nome}</option>)}
                </Select>
                <Botao type="button" variante="secundaria" onClick={() => setCriandoLoteNovo(true)} aria-label="Criar novo lote">
                  <Plus size={20} />
                </Botao>
              </div>
            ) : (
              <div className="bg-surface-2 rounded-xl p-4 space-y-4">
                <Campo rotulo="Nome do novo lote" id="novoLoteNome">
                  <Input id="novoLoteNome" value={novoLoteNome} onChange={(e) => setNovoLoteNome(e.target.value)} />
                </Campo>
                <Campo rotulo="Valor por @ do lote (R$)" id="novoLoteValor" dica="Todos os animais do lote entram com esse valor">
                  <Input id="novoLoteValor" type="number" step="0.01" inputMode="decimal" value={novoLoteValor} onChange={(e) => setNovoLoteValor(e.target.value)} />
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

          <Campo rotulo="Data de entrada" id="data" dica="Já vem com a data de hoje — mude só se for outro dia">
            <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Peso (arrobas)" id="peso">
              <Input id="peso" type="number" step="0.01" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} required />
            </Campo>
            <Campo
              rotulo="Valor por @ (R$)"
              id="valor"
              dica={valor === '' && valorDoLote ? `Vazio = usa o do lote (${moeda(valorDoLote)})` : undefined}
            >
              <Input id="valor" type="number" step="0.01" inputMode="decimal" value={valor} placeholder={valorDoLote ? String(valorDoLote) : ''} onChange={(e) => setValor(e.target.value)} />
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