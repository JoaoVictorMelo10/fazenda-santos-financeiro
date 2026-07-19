import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import supabase from './supabaseClient.js'
import { Tela } from './componentes/Tela'
import { Cartao, Selo, Select, EstadoVazio, Esqueleto, MarcaFerro } from './componentes/UI'
import { moeda } from './lib/formato'
import { Search } from 'lucide-react'

function ListarAnimais() {
  const [itens, setItens] = useState([])
  const [status, setStatus] = useState('ativo')
  const [lotes, setLotes] = useState([])
  const [loteId, setLoteId] = useState('todos')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.from('lotes').select('id, nome').order('nome').then(({ data }) => setLotes(data || []))
  }, [])

  useEffect(() => {
    async function buscar() {
      setCarregando(true)

      let query = status === 'ativo'
        ? supabase.from('vw_animais_em_aberto').select('*, lotes(nome)')
        : supabase.from('animais').select('*, lotes(nome)').eq('status', status)

      if (loteId !== 'todos') {
        query = query.eq('lote_id', loteId)
      }

      const resposta = await query.order('numero_ferro')
      setItens(resposta.data || [])
      setCarregando(false)
    }
    buscar()
  }, [status, loteId])

  const itensFiltrados = busca
    ? itens.filter((animal) => String(animal.numero_ferro).includes(busca.trim()))
    : itens

  return (
    <Tela titulo="Animais">
      <div className="relative mb-3">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-soft" />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Buscar pelo número do ferro"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full rounded-xl border-2 border-border bg-white pl-11 pr-4 py-3.5 text-base focus:border-primary focus:outline-none"
        />
      </div>

      <div className="flex gap-2 mb-4">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="flex-1" aria-label="Filtrar por situação">
          <option value="ativo">Em aberto</option>
          <option value="vendido">Vendidos</option>
          <option value="perda">Perdas</option>
        </Select>
        <Select value={loteId} onChange={(e) => setLoteId(e.target.value)} className="flex-1" aria-label="Filtrar por lote">
          <option value="todos">Todos os lotes</option>
          {lotes.map((lote) => <option key={lote.id} value={lote.id}>{lote.nome}</option>)}
        </Select>
      </div>

      {carregando && (
        <div className="space-y-3">
          <Esqueleto altura="h-20" />
          <Esqueleto altura="h-20" />
          <Esqueleto altura="h-20" />
        </div>
      )}

      {!carregando && itensFiltrados.length === 0 && (
        <EstadoVazio titulo="Nenhum animal encontrado" descricao="Tente mudar o filtro ou a busca" />
      )}

      <div className="space-y-3 anima-lista">
        {!carregando && itensFiltrados.map((animal) => (
          <Link to={`/animal/${animal.numero_ferro}`} key={animal.id} className="block">
            <Cartao className="hover:border-primary active:scale-[0.99] transition-all duration-150 flex items-center gap-4">
              <MarcaFerro numero={animal.numero_ferro} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{animal.lotes?.nome || 'Compra avulsa'}</p>
                <p className="text-text-soft text-sm">
                  {animal.status === 'ativo'
                    ? `${animal.dias_na_fazenda} dias na fazenda`
                    : `Entrada em ${new Date(animal.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                </p>
              </div>
              {animal.status === 'ativo' && (
                <Selo tipo="aberto">{moeda(animal.custo_acumulado, 0)}</Selo>
              )}
              {animal.status === 'vendido' && <Selo tipo="vendido">Vendido</Selo>}
              {animal.status === 'perda' && <Selo tipo="perda">Perda</Selo>}
            </Cartao>
          </Link>
        ))}
      </div>
    </Tela>
  )
}

export default ListarAnimais
