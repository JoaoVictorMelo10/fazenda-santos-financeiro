import { useState, useEffect } from "react";
import supabase from './supabaseClient.js';
import { useParams, Link } from 'react-router-dom';

function ExibirAnimal() {
    const { numero_ferro } = useParams();
    const [dadosAnimal, setDadosAnimal] = useState(null);
    const [custosAnimal, setCustosAnimal] = useState([]);

    useEffect(() => {

        async function BuscarDados() {
            const resposta = await supabase
                .from('animais')
                .select('*')
                .eq('numero_ferro', numero_ferro)
                .single();
            setDadosAnimal(resposta.data);
        }

        async function BuscarCustos() {
            const resposta = await supabase
                .from('custos')
                .select('*')
                .eq('animal_ferro', numero_ferro)
            setCustosAnimal(resposta.data);
        }

        BuscarDados();
        BuscarCustos();
    }, []);

    const custoTotal = custosAnimal.reduce((acumulador, custo) => acumulador + custo.valor, 0);

    return (
        <div>
            <h2>Detalhes do gado número {numero_ferro}</h2>

            <div>
                <p>Peso de entrada: {dadosAnimal?.peso_entrada} arrobas</p>
                <p>Valor de compra do animal: {dadosAnimal?.peso_entrada * dadosAnimal?.valor_arroba}</p>
            </div>

            <div>
                <h3>Custos do animal</h3>


                <p>Soma de todos os custos: {custoTotal}</p>
                {custosAnimal.map((custo) => (
                    <div>

                        <p>Categoria do custo: {custo.categoria}</p>
                        <p>Valor: {custo.valor}</p>
                    </div>

                ))}

                <p><Link to="/lancamento-custo">Lançar Custo</Link></p>
                <p><Link to="/registro-venda">Registrar venda</Link></p>
            </div>

        </div>

    );

}

export default ExibirAnimal