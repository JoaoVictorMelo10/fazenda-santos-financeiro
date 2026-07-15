import supabase from './supabaseClient.js'
import { useState, useEffect } from "react";

function LancamentoCusto() {
    const [loteOuFerro, setLoteOuFerro] = useState('')
    const [ferro, setFerro] = useState('')
    const [lote, setLote] = useState('')
    const [categoria, setCategoria] = useState('')
    const [valor, setValor] = useState('')
    const [data, setData] = useState('')
    const [quemLancou, setQuemLancou] = useState('')
    const [observacao, setObservacao] = useState('')

    async function EnviarCusto(evento) {
        evento.preventDefault()

        let ferroFinal = ferro
        let loteFinal = lote
        if (loteOuFerro === 'ferro') {
            loteFinal = null
        } else if (loteOuFerro === 'lote') {
            ferroFinal = null
        }

        const resposta = await supabase
            .from('custos')
            .insert([
                { animal_ferro: ferroFinal || null, categoria: categoria, valor: valor, data_lancamento: data, quem_lancou: quemLancou, observacao: observacao, lote: loteFinal || null }
            ])


        console.log(resposta)
    }

    return (
        <div>
            <form>
                <select value={categoria} onChange={(evento) => setCategoria(evento.target.value)}>
                    <option value="ração">Ração</option>
                    <option value="sal mineral">Sal mineral</option>
                    <option value="veterinario">Veterinario</option>
                    <option value="vacina/medicamento">Vacina/medicamento</option>
                    <option value="transporte">Transporte</option>
                    <option value="outro">Outro</option>
                </select>

                <select value={loteOuFerro} onChange={(evento) => setLoteOuFerro(evento.target.value)}>
                    <option value="">Selecione o tipo de lançamento...</option>
                    <option value="ferro">Animal individual (Ferro)</option>
                    <option value="lote">Lote inteiro</option>
                </select>

                {loteOuFerro === 'ferro' && (
                    <input type='number' placeholder='Digite a numeração do gado' value={ferro} onChange={(evento) => setFerro(evento.target.value)} />
                )}
                {loteOuFerro === 'lote' && (
                    <input type='text' placeholder='Digite qual o lote' value={lote} onChange={(evento) => setLote(evento.target.value)} />
                )}

                <input type='number' placeholder='Digite o valor gasto' value={valor} onChange={(evento) => setValor(evento.target.value)} />
                <br></br>
                <input type='date' placeholder='Digite a data do custo' value={data} onChange={(evento) => setData(evento.target.value)} />
                <br></br>
                <input type='text' placeholder='Digite seu nome (quem está registrando o custo)' value={quemLancou} onChange={(evento) => setQuemLancou(evento.target.value)} />
                <br></br>
                <input type='text' placeholder='Caso tenha observações, digite aqui' value={observacao} onChange={(evento) => setObservacao(evento.target.value)} />

                <button onClick={(evento) => EnviarCusto(evento)}>Enviar</button>
            </form>
        </div>
    )
}

export default LancamentoCusto