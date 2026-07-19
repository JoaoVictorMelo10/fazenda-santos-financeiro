-- Passo 3 de 3. Roda depois do 01-renomear-tabelas-antigas.sql e do migration.sql, nessa ordem.
-- Traz os dados reais das tabelas antigas (agora com sufixo _antigo) pro schema novo.

-- lotes: reconstrói a partir dos nomes de lote usados em animais e custos,
-- porque a tabela lotes antiga guardava o nome como número (nome_lote bigint)
-- e nunca batia de verdade com o texto usado nas outras tabelas.
insert into lotes (nome)
select distinct trim(nome) from (
  select lote_origem as nome from animais_antigo where lote_origem is not null and trim(lote_origem) <> ''
  union
  select lote as nome from custos_antigo where lote is not null and trim(lote) <> ''
) origem
where trim(nome) <> '';

insert into animais (
  numero_ferro, data_entrada, peso_entrada_arr, valor_arroba_compra,
  lote_id, observacao, status, custo_medio_mensal, criado_em
)
select
  a.numero_ferro,
  a.data_entrada,
  a.peso_entrada,
  a.valor_arroba,
  l.id,
  a."observação",
  case a.status
    when 'em aberto' then 'ativo'
    when 'vendido' then 'vendido'
    when 'perda' then 'perda'
    else 'ativo'
  end,
  a.custo_medio_mensal,
  a.created_at
from animais_antigo a
left join lotes l on l.nome = a.lote_origem
on conflict (numero_ferro) do nothing;

-- categoria antiga era texto livre, então mapeia pro enum novo por aproximação.
-- linhas de teste (categoria "EMPTY", nula ou desconhecida) caem em "outro" e dá
-- pra corrigir isso na mão depois, direto no app ou no Table Editor.
-- "quem_lancou" não tinha ligação confiável com um usuário de verdade, então o
-- nome que estava lá vai preservado dentro da observação, não é perdido.
insert into custos (
  animal_id, lote_id, categoria, valor, data, descricao, lancado_em
)
select
  an.id,
  lt.id,
  case
    when c.categoria ilike '%ração%' then 'racao'
    when c.categoria ilike '%sal%' then 'sal_mineral'
    when c.categoria ilike '%vet%' then 'veterinario'
    when c.categoria ilike '%vacin%' then 'vacina'
    when c.categoria ilike '%transp%' then 'transporte'
    else 'outro'
  end,
  c.valor,
  coalesce(c.data_lancamento, c.created_at::date),
  nullif(trim(
    coalesce(c.observacao, '') ||
    case when c.quem_lancou is not null and trim(c.quem_lancou) <> ''
         then ' (lançado por ' || c.quem_lancou || ')'
         else '' end
  ), ''),
  c.created_at
from custos_antigo c
left join animais an on an.numero_ferro = c.animal_ferro
left join lotes lt on lt.nome = c.lote
where an.id is not null or lt.id is not null;

insert into vendas (
  animal_id, data_venda, peso_saida_arr, valor_arroba_venda, comprador, lancado_em
)
select
  an.id,
  v.data_venda,
  v.peso_venda,
  v.valor_arroba,
  v.comprador,
  v.created_at
from vendas_antigo v
join animais an on an.numero_ferro = v.animal_ferro
where v.peso_venda is not null and v.valor_arroba is not null;

-- Confira o resultado antes de apagar as tabelas antigas.
-- select * from animais;
-- select * from custos;
-- select * from vendas;
-- select * from lotes;

-- Só depois de conferir tudo, apague as tabelas antigas:
-- drop table animais_antigo, custos_antigo, vendas_antigo, lotes_antigo, usuario_antigo;
