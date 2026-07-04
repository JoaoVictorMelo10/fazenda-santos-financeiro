import { useState, useEffect } from "react";
import supabase from './supabaseClient.js'



/*criar um parágrafo <p> para cada animal exibindo o
 numero_ferro e o
  peso_entrada que vieram do banco. */


function ListarAnimais() {
    const [itens, setItens] = useState([])

    async function buscarDados() {
        const lista = await supabase.from('animais').select('*')
        setItens(lista.data)

        console.log(lista)
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
        </div>
    )

}


export default ListarAnimais
