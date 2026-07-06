import { useState, useEffect } from "react";
import supabase from "./supabaseClient";

function PainelPrincipal() {

    const [totalAnimais, setTotalAnimais] = useState(0)
    const [ultimosCustos, setUltimosCustos] = useState([])
    const [ultimasVendas, setUltimasVendas] = useState([])
    const [custoTotal, setCustoTotal] = useState(0)



    useEffect(() => {
        async function FiltroBusca() {
            const resposta = await supabase.from('animais').select('*').eq('status', 'em aberto')
            setTotalAnimais(resposta.data.length)
        }

        async function CincoCustos() {
            const resposta = await supabase.from('custos').select('*').limit(5)
            setUltimosCustos(resposta.data)

            console.log(resposta.data)
        }

        async function UltimasVendas() {
            const resposta = await supabase.from('vendas').select('*').limit(5)
            setUltimasVendas(resposta.data)

            console.log(resposta.data)
        }

        async function SomarCustos() {
            const resposta = await supabase.from('custos').select('valor')
            let total = 0;
            resposta.data.forEach((custo) => {
                total = total + custo.valor;
            });
            setCustoTotal(total);
        }


        FiltroBusca()
        CincoCustos()
        UltimasVendas()
        SomarCustos()

        console.log("O painel carregou!")
    }, []);


    return (
        <div>
            <h2 >Animais na fazenda: {totalAnimais} </h2>
            <h2>Custo total acumulado dos animais na fazenda: {custoTotal}</h2>

            <h2>Ultimos 5 lançamentos de custo: </h2>
            {ultimosCustos.map((custo,index) => (
                <p key={index}> {custo.categoria} -R$ {custo.valor} </p>
            ))}

            <h2>Ultimas vendas realizadas: </h2>
            {ultimasVendas.map((venda,index) => (
                <p key={index}> {venda.animal_ferro} {venda.peso_venda}</p>
            ))}
        </div>
    )

}

export default PainelPrincipal