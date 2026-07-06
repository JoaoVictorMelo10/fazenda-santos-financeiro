import supabase from "./supabaseClient";
import { useState } from "react";


/*Número do ferro (type="number")
Data de venda (type="date")
Peso de saída em arrobas (type="number")
Valor por arroba recebido (type="number")
Frigorífico / comprador (type="text")*/

function LancamentoVendas() {

    const [ferro, setFerro] = useState('')
    const [data, setData] = useState('')
    const [peso, setPeso] = useState('')
    const [valor, setValor] = useState('')
    const [comprador, setComprador] = useState('')

    async function EnviarVendas() {
        if (ferro === '' || data ==='' || peso ==='' || valor ==='' || comprador ==='') {
            alert("Complete todos os campos!");
            return;
        }

        const resposta = await supabase
        .from('vendas')
        .insert([
            {animal_ferro:Number(ferro), data_venda:data, peso_venda:Number(peso), valor_arroba:Number(valor), comprador:comprador}
        ])

        console.log(resposta)
    }

    return(
        <div>
            <input type="number" placeholder="Número do ferro do animal" value={ferro} onChange={(evento) => setFerro(evento.target.value)}/>
            <input type="date" placeholder="Data da venda" value={data} onChange={(evento) => setData(evento.target.value)}/>
            <input type="number" placeholder="Peso de saída em arrobas" value={peso} onChange={(evento) => setPeso(evento.target.value)}/>
            <input type="number" placeholder="Valor por arroba recebido" value={valor} onChange={(evento) => setValor(evento.target.value)}/>
            <input type="text" placeholder="Nome do frigorífico/ comprador" value={comprador} onChange={(evento) => setComprador(evento.target.value)}/>

            <button onClick={EnviarVendas}>Confirmar venda</button>
        </div>
    )
}

export default LancamentoVendas