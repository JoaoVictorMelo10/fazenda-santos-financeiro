import { useState, useEffect } from "react"
import supabase from './supabaseClient.js'




/*criar um parágrafo <p> para cada animal exibindo o
 numero_ferro e o
  peso_entrada que vieram do banco. */


/* a Tela 3 precisa de três filtros: por status (em aberto, vendido ou perda), por lote, e a busca direta pelo número do ferro*/


function ListarAnimais() {
    const [itens, setItens] = useState([])
    const [tipoBusca,setTipoBusca] = useState('')
    const [status, setStatus] = useState ('')
    const [lote, setLote] = useState('')
    const [numeroFerro, setNumeroFerro] = useState(0)

/*     async function buscarDados() {
        const lista = await supabase.from('animais').select('*')
        setItens(lista.data)

        console.log(lista)
    } */

        async function buscarDados() {

            let query = supabase.from('animais').select('*')

            if (tipoBusca === 'status') {
                query = query.eq('status', status)
            } else if (tipoBusca === 'lote') {
                query = query.eq('lote_origem', lote)
            } else if (tipoBusca === 'numero_ferro') {
                query = query.eq('numero_ferro', numeroFerro)
            }

            const resposta = await query;
            console.log(resposta)
            
            
            setItens(resposta.data)
        }

    useEffect(() => {
        buscarDados()
    }, [])


    return (
        <div>
            <h3>Lista de animais</h3>
            {itens.map((animal) => (
                <p key={animal.numero_ferro}> numero do ferro: {animal.numero_ferro} peso de entrada: {animal.peso_entrada}</p>
            )
            )}

            {/* escolha do tipo de filtro */}
            <select value={tipoBusca} onChange={(evento) => setTipoBusca(evento.target.value)}>
                <option value="">Escolha o tipo de busca</option>
                <option value="status">Status</option>
                <option value="lote">Lote</option>
                <option value="numeroFerro">Número do fero</option>
            </select>

            {tipoBusca === 'status' && (
                <select value={status} onChange={(evento) => setStatus(evento.target.value)}>
                    <option value="em aberto">Em aberto</option>
                    <option value="vendido">Vendido</option>
                    <option value="perda">Perda</option>
                </select>
            )}

            {tipoBusca === 'lote' && (
                <input type="text" placeholder="Digite o lote" value={lote} onChange={(evento) => setLote(evento.target.value)}/>
            )}

            {tipoBusca === 'numeroFerro' && (
                <input type="number" placeholder="Digite o número do ferro" value={numeroFerro} onChange={(evento) => setNumeroFerro(evento.target.value)}/>
            )}

            
            <button onClick={buscarDados}>Buscar</button>

        </div>
    )

}


export default ListarAnimais
