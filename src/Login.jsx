/* import supabase

<input>email</input>

<input>login</input>

export default Login */

import supabase from './supabaseClient.js'
import { useState} from 'react'

function FormularioLogin() {

    const [Email, setEmail] = useState('')
    const [Senha, setSenha] = useState('')

    async function FazerLogin() {
        const resposta = await supabase.auth.signInWithPassword({
            email: Email,
            password: Senha
        })

        console.log(resposta)
    }

    return (

        <div>
            {/* <input type="email" placeholder='Digite seu email'/> */}
            <input type='email' placeholder='digite seu email' value={Email} onChange={(evento) => setEmail(evento.target.value)}/>

            {/* <input type="password" placeholder='Digite sua senha'/> */}
            <input type='password' placeholder='digite sua senha' value={Senha} onChange={(evento) => setSenha(evento.target.value)}/>

            <button onClick={FazerLogin}>Enviar</button>           
        </div> 
    )
}

export default FormularioLogin