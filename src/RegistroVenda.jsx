import supabase from "./supabaseClient"
import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "./AuthContext"
import { salvarVendaOffline } from "./lib/db"
import { Tela } from "./componentes/Tela"
import { Cartao, Campo, Input, Botao, Alerta } from "./componentes/UI"
import { hojeISO, moeda } from "./lib/formato"

function RegistroVenda() {
  const { sessao } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [ferro, setFerro] = useState(params.get('ferro') || '')
  const [data, setData] = useState(hojeISO())
  const [peso, setPeso] = useState('')
  const [valor, setValor] = useState('')
  const [comprador, setComprador] = useState('')

  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  const valorTotal = (Number(peso) || 0) * (Number(valor) || 0)

  async function enviarVenda(evento) {
    evento.preventDefault()
    setErro('')
    setMensagem('')

    if (!ferro || !data || !peso || !valor || !comprador) {
      setErro('Preencha todos os campos.')
      return
    }

    setEnviando(true)

    if (!navigator.onLine) {
      await salvarVendaOffline({
        _numero_ferro_pendente: Number(ferro),
        data_venda: data,
        peso_saida_arr: Number(peso),
        valor_arroba_venda: Number(valor),
        comprador,
        lancado_por: sessao?.user?.id,
      })
      setMensagem('Sem internet agora. A venda ficou guardada no celular e será enviada sozinha quando a conexão voltar.')
      setFerro(''); setPeso(''); setValor(''); setComprador('')
      setEnviando(false)
      return
    }

    const { data: animal, error: erroAnimal } = await supabase
      .from('animais')
      .select('id, status')
      .eq('numero_ferro', Number(ferro))
      .maybeSingle()

    if (erroAnimal || !animal) {
      setErro(`Nenhum animal encontrado com o ferro nº ${ferro}.`)
      setEnviando(false)
      return
    }

    if (animal.status !== 'ativo') {
      setErro(`Esse animal já está marcado como "${animal.status === 'vendido' ? 'vendido' : 'perda'}".`)
      setEnviando(false)
      return
    }

    const { error } = await supabase.from('vendas').insert([{
      animal_id: animal.id,
      data_venda: data,
      peso_saida_arr: Number(peso),
      valor_arroba_venda: Number(valor),
      comprador,
      lancado_por: sessao?.user?.id,
    }])

    setEnviando(false)

    if (error) {
      setErro('Erro ao registrar a venda: ' + error.message)
      return
    }

    setMensagem('Venda registrada. Abrindo o resultado do animal...')
    setTimeout(() => navigate(`/animal/${ferro}`), 900)
  }

  return (
    <Tela titulo="Registrar venda" voltar>
      <form onSubmit={enviarVenda} className="space-y-4 anima-lista">
        <Cartao className="space-y-4">
          <Campo rotulo="Número do ferro" id="ferro">
            <Input id="ferro" type="number" inputMode="numeric" value={ferro} onChange={(e) => setFerro(e.target.value)} />
          </Campo>

          <Campo rotulo="Data da venda" id="data" dica="Já vem com hoje">
            <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Peso de saída (@)" id="peso">
              <Input id="peso" type="number" step="0.01" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} />
            </Campo>
            <Campo rotulo="Valor por @ (R$)" id="valor">
              <Input id="valor" type="number" step="0.01" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
            </Campo>
          </div>

          <Campo rotulo="Comprador" id="comprador" dica="Frigorífico ou nome de quem comprou">
            <Input id="comprador" value={comprador} onChange={(e) => setComprador(e.target.value)} />
          </Campo>
        </Cartao>

        {valorTotal > 0 && (
          <Cartao className="flex items-center justify-between anima-pop">
            <span className="text-text-soft font-medium">Valor total da venda</span>
            <span className="font-display text-2xl font-semibold numeros text-primary">{moeda(valorTotal)}</span>
          </Cartao>
        )}

        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        {mensagem && <Alerta tipo="sucesso">{mensagem}</Alerta>}

        <Botao type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Enviando...' : 'Confirmar venda'}
        </Botao>
      </form>
    </Tela>
  )
}

export default RegistroVenda
