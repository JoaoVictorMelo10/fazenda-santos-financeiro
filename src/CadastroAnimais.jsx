/*número do ferro,
data de entrada, 
peso em arrobas
valor por arroba pago*/

import supabase from './supabaseClient.js'
import { useState} from 'react'

function CadastroAnimais() {

    const [Ferro, setFerro] = useState('')
    const [Data, setData] = useState('')
    const [Peso, setPeso] = useState('')
    const [Valor, setValor] = useState('')

    async function EnviarCadastro() {
        const resposta = await supabase
        .from('animais')
        .insert([
            {numero_ferro: Ferro, data_entrada: Data, peso_entrada: Peso, valor_arroba: Valor}
        ])


        console.log(resposta)
    }

    return (
        <div>
            <input type='number' placeholder='Digite o número do ferro do animal' value={Ferro} onChange={(evento) => setFerro(evento.target.value)}/>

            <input type='date' placeholder='Digite a data de chegada do animal' value={Data} onChange={(evento) => setData(evento.target.value)}/>

            <input type='number' placeholder='Digite o peso em arrobas' value={Peso} onChange={(evento) => setPeso(evento.target.value)}/>

            <input type='number' placeholder='Digite o valor pago por arroba' value={Valor} onChange={(evento) => setValor(evento.target.value)}/>

            <button onClick={EnviarCadastro}>Enviar</button>            
        </div>
    )
}

export default CadastroAnimais
