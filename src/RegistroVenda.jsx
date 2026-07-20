import supabase from "./supabaseClient"
import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "./AuthContext"
import { Tela } from "./componentes/Tela"
import { Cartao, Campo, Input, Botao, Alerta } from "./componentes/UI"
import { hojeISO, moeda } from "./lib/formato"
import { Plus, X } from "lucide-react"

// Venda em grupo: normalmente vende-se vários animais de uma vez (não
// necessariamente do mesmo lote de compra) pro mesmo comprador, no mesmo dia,
// ao mesmo preço por @. Aqui monta-se um "lote de venda": comprador, data e
// preço valem pra todos, e cada linha é um animal (ferro + peso de saída).
// O preço por @ pode ser mudado em qualquer linha, se precisar.

function linhaVazia() {
  return { ferro: '', peso: '', valor: '' }
}

function RegistroVenda() {
  const { sessao } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [data, setData] = useState(hojeISO())
  const [comprador, setComprador] = useState('')
  const [valorPadrao, setValorPadrao] = useState('')
  const [linhas, setLinhas] = useState([
    params.get('ferro') ? { ferro: params.get('ferro'), peso: '', valor: '' } : linhaVazia(),
  ])

  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  function atualizarLinha(indice, campo, valor) {
    setLinhas(linhas.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)))
  }
  function adicionarLinha() {
    setLinhas([...linhas, linhaVazia()])
  }
  function removerLinha(indice) {
    setLinhas(linhas.filter((_, i) => i !== indice))
  }

  // Total: cada linha usa seu próprio valor, ou o valor padrão do grupo
  const total = linhas.reduce((soma, l) => {
    const v = l.valor !== '' ? Number(l.valor) : Number(valorPadrao) || 0
    return soma + (Number(l.peso) || 0) * v
  }, 0)
  const totalCabecas = linhas.filter((l) => l.ferro && l.peso).length

  async function enviarVenda(evento) {
    evento.preventDefault()
    setErro('')
    setMensagem('')

    if (!data || !comprador) {
      setErro('Preencha o comprador e a data.')
      return
    }
    if (!valorPadrao && linhas.some((l) => !l.valor)) {
      setErro('Informe o valor por @ do grupo (ou preencha em cada linha).')
      return
    }
    const preenchidas = linhas.filter((l) => l.ferro && l.peso)
    if (preenchidas.length === 0) {
      setErro('Adicione pelo menos um animal com ferro e peso.')
      return
    }

    // Um animal só pode ser vendido uma vez — barra ferro repetido no mesmo grupo
    const ferros = preenchidas.map((l) => String(l.ferro).trim())
    const repetido = ferros.find((f, i) => ferros.indexOf(f) !== i)
    if (repetido) {
      setErro(`O ferro nº ${repetido} está repetido na lista. Cada animal só pode entrar uma vez na venda.`)
      return
    }

    setEnviando(true)

    // Confere todos os ferros antes de vender qualquer um (tudo ou nada na validação)
    const resolvidos = []
    for (const l of preenchidas) {
      const { data: animal } = await supabase
        .from('animais')
        .select('id, status')
        .eq('numero_ferro', Number(l.ferro))
        .maybeSingle()

      if (!animal) {
        setErro(`Ferro nº ${l.ferro} não encontrado. Confira a lista antes de confirmar.`)
        setEnviando(false)
        return
      }
      if (animal.status !== 'ativo') {
        setErro(`Ferro nº ${l.ferro} já está como "${animal.status === 'vendido' ? 'vendido' : 'perda'}".`)
        setEnviando(false)
        return
      }
      resolvidos.push({
        animal_id: animal.id,
        data_venda: data,
        peso_saida_arr: Number(l.peso),
        valor_arroba_venda: l.valor !== '' ? Number(l.valor) : Number(valorPadrao),
        comprador,
        lancado_por: sessao?.user?.id,
      })
    }

    const { error } = await supabase.from('vendas').insert(resolvidos)
    setEnviando(false)

    if (error) {
      setErro('Erro ao registrar as vendas: ' + error.message)
      return
    }

    setMensagem(`${resolvidos.length} venda(s) registrada(s). Abrindo os relatórios...`)
    setTimeout(() => navigate('/relatorios'), 1000)
  }

  return (
    <Tela titulo="Registrar venda" voltar>
      <form onSubmit={enviarVenda} className="space-y-4 anima-lista">
        <Cartao className="space-y-4">
          <Campo rotulo="Comprador" id="comprador" dica="Frigorífico ou nome de quem comprou">
            <Input id="comprador" value={comprador} onChange={(e) => setComprador(e.target.value)} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Data da venda" id="data" dica="Vale pra todos">
              <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </Campo>
            <Campo rotulo="Valor por @ (R$)" id="valorPadrao" dica="Vale pra todo o grupo">
              <Input id="valorPadrao" type="number" step="any" inputMode="decimal" value={valorPadrao} onChange={(e) => setValorPadrao(e.target.value)} />
            </Campo>
          </div>
        </Cartao>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-display text-lg font-semibold">Animais da venda</p>
            <span className="text-text-soft text-sm">{totalCabecas} cabeça{totalCabecas !== 1 ? 's' : ''}</span>
          </div>

          <div className="space-y-2">
            {linhas.map((linha, indice) => (
              <Cartao key={indice} className="py-3">
                <div className="flex items-start gap-2">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <div>
                      <label className="block text-xs font-semibold text-text-soft mb-1">Ferro</label>
                      <Input type="number" inputMode="numeric" value={linha.ferro} onChange={(e) => atualizarLinha(indice, 'ferro', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-soft mb-1">Peso saída (@)</label>
                      <Input type="number" step="any" inputMode="decimal" value={linha.peso} onChange={(e) => atualizarLinha(indice, 'peso', e.target.value)} />
                    </div>
                  </div>
                  {linhas.length > 1 && (
                    <button type="button" onClick={() => removerLinha(indice)} aria-label="Remover este animal" className="mt-6 p-1.5 text-text-soft rounded-full hover:bg-danger-soft hover:text-danger shrink-0">
                      <X size={18} />
                    </button>
                  )}
                </div>

                {linha.valor === '' && !linha.mostrarValor ? (
                  <button type="button" onClick={() => atualizarLinha(indice, 'mostrarValor', true)} className="mt-2 text-sm font-semibold text-primary">
                    Preço diferente pra este animal?
                  </button>
                ) : (
                  <div className="mt-2">
                    <label className="block text-xs font-semibold text-text-soft mb-1">Valor por @ só deste animal (R$)</label>
                    <div className="flex gap-2">
                      <Input type="number" step="any" inputMode="decimal" value={linha.valor} placeholder={valorPadrao || 'ex.: 305'} onChange={(e) => atualizarLinha(indice, 'valor', e.target.value)} />
                      <Botao type="button" variante="fantasma" tamanho="pequeno" onClick={() => { atualizarLinha(indice, 'valor', ''); atualizarLinha(indice, 'mostrarValor', false) }}>
                        Usar o do grupo
                      </Botao>
                    </div>
                  </div>
                )}
              </Cartao>
            ))}
          </div>

          <Botao type="button" variante="secundaria" className="w-full mt-2" onClick={adicionarLinha}>
            <Plus size={20} />
            Adicionar outro animal
          </Botao>
        </div>

        {total > 0 && (
          <Cartao className="flex items-center justify-between anima-pop">
            <div>
              <p className="text-text-soft font-medium">Total da venda</p>
              <p className="text-text-soft text-sm">{totalCabecas} cabeça{totalCabecas !== 1 ? 's' : ''}</p>
            </div>
            <span className="font-display text-2xl font-semibold numeros text-primary">{moeda(total)}</span>
          </Cartao>
        )}

        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        {mensagem && <Alerta tipo="sucesso">{mensagem}</Alerta>}

        <Botao type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Registrando...' : `Confirmar venda${totalCabecas > 1 ? ` (${totalCabecas} animais)` : ''}`}
        </Botao>
      </form>
    </Tela>
  )
}

export default RegistroVenda