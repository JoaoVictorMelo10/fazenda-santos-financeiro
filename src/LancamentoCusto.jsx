import supabase from './supabaseClient.js'
import { useState, useEffect } from "react";

function LancamentoCusto() {
    const [ferro, setFerro] = useState('')
    const [categoria, setCategoria] = useState('')
    const [valor, setValor] = useState('')
    const [data, setData] = useState('')
    const [quemLancou, setQuemLancou] = useState ('')
    const [observacao,setObservacao] = useState('')

    async function EnviarCusto() {
        const resposta = await supabase
            .from('custos')
            .insert([
                { animal_ferro: ferro, categoria: categoria, valor:valor, data_lancamento: data, quem_lancou: quemLancou, observacao: observacao }
            ])


        console.log(resposta)
    }

    return (
        <div>
            <select value={categoria} onChange={(evento)=> setCategoria(evento.target.value)}>
                <option>Ração</option>
                <option>Sal mineral</option>
                <option>Veterinario</option>
                <option>Vacina/medicamento</option>
                <option>Transporte</option>
                <option>Outro</option>
            </select>

            <input type='number' placeholder='Digite a numeração do gado' value={ferro} onChange={(evento) => setFerro(evento.target.value)}/>
            <input type='number' placeholder='Digite o valor gasto' value={valor} onChange={(evento) => setValor(evento.target.value)}/>
            <input type='date' placeholder='Digite a data do custo' value={data} onChange={(evento) => setData(evento.target.value)}/>
            <input type='text' placeholder='Digite seu nome (quem está registrando o custo)' value={quemLancou} onChange={(evento) => setQuemLancou(evento.target.value)}/>
            <input type='text' placeholder='Caso tenha observações, digite aqui' value={observacao} onChange={(evento) => setObservacao(evento.target.value)}/>

            <button onClick={EnviarCusto}>Enviar</button>
        </div>
    )
}

export default LancamentoCusto