import { useState, useEffect, useCallback } from "react"
import supabase from './supabaseClient.js'
import { useParams, Link } from 'react-router-dom'
import { Tela } from './componentes/Tela'
import { Cartao, Selo, EstadoVazio, Esqueleto, MarcaFerro, Campo, Input, Botao, Alerta } from './componentes/UI'
import { moeda, formatarData } from './lib/formato'
import { Pencil } from 'lucide-react'
import { buscarPrecoArroba } from './lib/preco'

const GANHO_ARROBA_MES = 1
const TETO_MESES_SEM_ALVO = 12

function TelaDetalheLote() {
  const { lote_id } = useParams()
  const [resumo, setResumo] = useState(null)
  const [animais, setAnimais] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [arroba, setArroba] = useState(null)
  const [editando, setEditando] = useState(false)
  const [nomeEdit, setNomeEdit] = useState('')
  const [dataEdit, setDataEdit] = useState('')
  const [erroEdit, setErroEdit] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    const { data: resumoData } = await supabase
      .from('vw_resumo_lote')
      .select('*')
      .eq('lote_id', lote_id)
      .maybeSingle()
    setResumo(resumoData)

    const { data: animaisData } = await supabase
      .from('vw_resultado_animal')
      .select('*')
      .eq('lote_id', lote_id)
      .order('numero_ferro')
    setAnimais(animaisData || [])
    setCarregando(false)
  }, [lote_id])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga assíncrona, setState roda após await
  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { buscarPrecoArroba().then(setArroba) }, [])

  function abrirEdicao() {
    setNomeEdit(resumo.lote_nome || '')
    setDataEdit(resumo.data_compra ? String(resumo.data_compra).slice(0, 10) : '')
    setErroEdit('')
    setEditando(true)
  }

  async function salvarEdicao(evento) {
    evento.preventDefault()
    setErroEdit('')
    if (!nomeEdit.trim()) { setErroEdit('O lote precisa de um nome.'); return }
    setSalvando(true)
    const { error } = await supabase.from('lotes')
      .update({ nome: nomeEdit.trim(), data_compra: dataEdit || null })
      .eq('id', lote_id)
    setSalvando(false)
    if (error) { setErroEdit('Erro ao salvar: ' + error.message); return }
    setEditando(false)
    carregar()
  }

  if (carregando) {
    return <Tela titulo="Lote" voltar><div className="space-y-3"><Esqueleto altura="h-32" /><Esqueleto altura="h-40" /></div></Tela>
  }
  if (!resumo) {
    return <Tela titulo="Lote" voltar><EstadoVazio titulo="Lote não encontrado" /></Tela>
  }

  const preco = Number(arroba?.preco) || null
  const abertos = animais.filter((a) => a.status === 'ativo')

  // "Se vendesse hoje": valor estimado dos animais em aberto ao preço do dia,
  // menos o que ainda está investido neles.
  let projecao = null
  if (preco && abertos.length > 0) {
    let pesoEstimado = 0
    let investidoAberto = 0
    for (const a of abertos) {
      const meses = Number(a.dias_na_fazenda_atual ?? diasDesde(a.data_entrada)) / 30.44
      const entrada = Number(a.peso_entrada_arr)
      const alvo = Number(a.peso_alvo_arr) || null
      const teto = alvo ?? entrada + GANHO_ARROBA_MES * TETO_MESES_SEM_ALVO
      pesoEstimado += Math.min(entrada + GANHO_ARROBA_MES * meses, teto)
      investidoAberto += Number(a.custo_total || a.valor_total_compra || 0)
    }
    const valorHoje = pesoEstimado * preco
    projecao = { pesoEstimado, valorHoje, investidoAberto, saldo: valorHoje - investidoAberto }
  }

  return (
    <Tela titulo={resumo.lote_nome} voltar>
      <div className="anima-lista">
        {editando ? (
          <Cartao as="form" onSubmit={salvarEdicao} className="mb-4 space-y-3 border-primary anima-pop">
            <p className="font-display text-lg font-semibold">Editar lote</p>
            <Campo rotulo="Nome do lote" id="nomeEdit">
              <Input id="nomeEdit" value={nomeEdit} onChange={(e) => setNomeEdit(e.target.value)} />
            </Campo>
            <Campo rotulo="Data da compra" id="dataEdit">
              <Input id="dataEdit" type="date" value={dataEdit} onChange={(e) => setDataEdit(e.target.value)} />
            </Campo>
            {erroEdit && <Alerta tipo="erro">{erroEdit}</Alerta>}
            <div className="flex gap-2">
              <Botao type="submit" className="flex-1" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Botao>
              <Botao type="button" variante="fantasma" onClick={() => setEditando(false)}>Cancelar</Botao>
            </div>
          </Cartao>
        ) : (
        <Cartao className="mb-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Selo tipo="aberto">{resumo.em_aberto} no pasto</Selo>
              {resumo.vendidos > 0 && <Selo tipo="vendido">{resumo.vendidos} vendidos</Selo>}
              {resumo.perdas > 0 && <Selo tipo="perda">{resumo.perdas} perdas</Selo>}
            </div>
            <button type="button" onClick={abrirEdicao} aria-label="Editar lote" className="p-1.5 -mt-1 -mr-1 text-text-soft rounded-full hover:bg-surface-2 shrink-0">
              <Pencil size={18} />
            </button>
          </div>
          <div className="space-y-1.5 text-sm">
            <Linha rotulo="Comprado em" valor={formatarData(resumo.data_compra)} />
            {resumo.valor_arroba_lote && <Linha rotulo="Valor de compra por @" valor={moeda(resumo.valor_arroba_lote)} />}
            <Linha rotulo="Investido no lote (compra + custos)" valor={moeda(resumo.investido_total)} destaque />
          </div>
        </Cartao>
        )}

        {projecao && (
          <Cartao className="mb-4">
            <p className="font-display text-lg font-semibold mb-1">Se vendesse o lote hoje</p>
            <p className="text-text-soft text-sm mb-3">Só os {resumo.em_aberto} em aberto, ao preço de hoje ({arroba?.rotulo || 'arroba'}).</p>
            <div className="flex items-end justify-between mb-3">
              <p className={`font-display text-3xl font-semibold numeros ${projecao.saldo >= 0 ? 'text-primary' : 'text-danger'}`}>
                {projecao.saldo >= 0 ? '+' : ''}{moeda(projecao.saldo, 0)}
              </p>
              <p className={`font-semibold text-sm mb-1 ${projecao.saldo >= 0 ? 'text-primary' : 'text-danger'}`}>
                {projecao.saldo >= 0 ? 'ganhando' : 'perdendo'}
              </p>
            </div>
            <div className="space-y-1 text-sm border-t border-border pt-2">
              <Linha rotulo={`Valor estimado hoje (~${projecao.pesoEstimado.toFixed(0)}@)`} valor={moeda(projecao.valorHoje, 0)} />
              <Linha rotulo="Ainda investido nesses animais" valor={moeda(projecao.investidoAberto, 0)} />
            </div>
          </Cartao>
        )}

        {resumo.vendidos > 0 && (
          <Cartao className="mb-4">
            <p className="font-display text-lg font-semibold mb-2">Já realizado</p>
            <div className="space-y-1.5 text-sm">
              <Linha rotulo="Recebido em vendas" valor={moeda(resumo.recebido)} />
              <Linha rotulo="Lucro dos vendidos" valor={moeda(resumo.lucro_realizado)} destaque
                cor={resumo.lucro_realizado >= 0 ? 'text-primary' : 'text-danger'} />
              {resumo.dias_medios_vendidos > 0 && <Linha rotulo="Tempo médio até a venda" valor={`${Math.round(resumo.dias_medios_vendidos)} dias`} />}
            </div>
          </Cartao>
        )}

        <p className="font-display text-lg font-semibold mb-2">Animais do lote</p>
        <div className="space-y-2">
          {animais.map((a) => (
            <Link to={`/animal/${a.numero_ferro}`} key={a.animal_id} className="block">
              <Cartao className="flex items-center gap-3 py-3 hover:border-primary transition-colors">
                <MarcaFerro numero={a.numero_ferro} tamanho="pequeno" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Ferro {a.numero_ferro}</p>
                  <p className="text-sm text-text-soft">
                    {a.status === 'ativo' && `${a.peso_entrada_arr}@ de entrada`}
                    {a.status === 'vendido' && `Vendido · lucro ${moeda(a.lucro || 0)}`}
                    {a.status === 'perda' && 'Perda'}
                  </p>
                </div>
                {a.status === 'ativo' && <Selo tipo="aberto">no pasto</Selo>}
                {a.status === 'vendido' && <Selo tipo="vendido">vendido</Selo>}
                {a.status === 'perda' && <Selo tipo="perda">perda</Selo>}
              </Cartao>
            </Link>
          ))}
        </div>
      </div>
    </Tela>
  )
}

function diasDesde(data) {
  return Math.max(Math.floor((new Date() - new Date(data + 'T00:00:00')) / 86400000), 0)
}

function Linha({ rotulo, valor, destaque, cor }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-text-soft">{rotulo}</span>
      <span className={`text-right numeros ${destaque ? 'font-semibold' : ''} ${cor || ''}`}>{valor}</span>
    </div>
  )
}

export default TelaDetalheLote