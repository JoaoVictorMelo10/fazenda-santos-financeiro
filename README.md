# Fazenda Santos — módulo financeiro

Controle financeiro do gado por número de ferro: compra, custos (individuais e por lote com rateio), vendas por arroba, projeção de lucro automática e relatórios. PWA instalável, com lançamento de custos e vendas funcionando sem internet.

## Visual e usabilidade

Feito pra celular e pra usuários 40+: fontes grandes, botões com área de toque generosa, rótulo sempre visível em cima de cada campo, cores de status sempre acompanhadas de texto, navegação fixa embaixo, datas já preenchidas com o dia de hoje. Paleta "Pastagem" (verde profundo + papel sálvia + ouro de capim) com animações leves de entrada e toque, respeitando `prefers-reduced-motion`.

Fontes: Fraunces (títulos e números) e Public Sans (texto), carregadas no `index.html`.

## Como rodar no computador

### 1. Frontend
```
npm install
npm run dev
```
Copie `.env.example` pra `.env` e preencha:
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Supabase → Settings → API)
- `VITE_BACKEND_URL` (opcional; endereço do backend, sem barra no final)
- `VITE_CODIGO_CONVITE` (opcional; se definir, criar conta exige esse código)

### 2. Backend (opcional)
Necessário só pra busca automática do preço da arroba (CEPEA) e pro PDF.
```
cd backend
python -m venv venv
source venv/Scripts/activate    # Windows com Git Bash
pip install -r requirements.txt
cp .env.example .env            # preencha SUPABASE_URL e SUPABASE_SERVICE_KEY
python app.py
```

### 3. Banco (Supabase)
O banco já está criado com `02-criar-schema-novo.sql` e `04-cadastro-automatico.sql`.

**Falta rodar uma vez o `supabase/05-corrigir-views.sql`** (SQL Editor → colar → Run). Ele corrige as views pra regra de correção (R5) não contar em dobro e adiciona o lote no resultado por animal. Pode rodar quantas vezes quiser sem estragar nada.

## Como publicar

### Frontend na Vercel
1. Suba o projeto no GitHub (o `.env` já está no `.gitignore` — confira que ele não foi junto).
2. Na Vercel: Add New → Project → importe o repositório. Framework: Vite (detecta sozinho).
3. Em Settings → Environment Variables, cadastre as mesmas variáveis do seu `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL`, `VITE_CODIGO_CONVITE`).
4. Deploy. O `vercel.json` já cuida das rotas do app (sem ele, atualizar a página numa tela interna daria erro 404).

### Backend no Render
1. New → Web Service → mesmo repositório, Root Directory `backend`.
2. Build: `pip install -r requirements.txt` · Start: `gunicorn app:app`
   (adicione `gunicorn` no `requirements.txt` se o Render pedir).
3. Environment: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` e, se quiser travar o CORS, `FRONTEND_ORIGIN` com o endereço da Vercel.
4. Copie a URL do serviço e coloque em `VITE_BACKEND_URL` na Vercel (e faça redeploy do frontend).

No plano grátis do Render o backend dorme após 15 min sem uso; a primeira busca de preço do dia pode demorar ~30 s. O app guarda o preço por 6 h no aparelho, então isso quase não aparece no uso real.

### Instalar no celular
Abra o endereço da Vercel no Chrome (Android) ou Safari (iPhone) → menu → "Adicionar à tela de início". Pro Antonio: abrir o app uma vez com internet; depois disso ele abre e lança custos/vendas sem sinal, e tudo sobe sozinho quando a conexão voltar.

## Contas dos usuários
Cada pessoa cria a própria conta em "Criar conta" na tela de entrada (nome, email, senha, função). O perfil entra sozinho no sistema. Se você definiu `VITE_CODIGO_CONVITE`, só entra quem tiver o código.
