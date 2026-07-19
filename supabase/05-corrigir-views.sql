-- Fazenda Santos — correção das views de cálculo.
-- Rode este arquivo inteiro no SQL Editor do Supabase (pode rodar mais de uma vez).
--
-- O que muda:
-- 1. Regra R5 aplicada de verdade: um lançamento corrigido deixa de contar
--    (antes, original + correção somavam juntos, dobrando o valor).
-- 2. vw_resultado_animal agora traz o lote, pra montar o resultado por lote
--    no relatório.

drop view if exists vw_animais_em_aberto;
drop view if exists vw_resultado_animal;
drop view if exists vw_custo_por_animal;

-- Um custo "vale" enquanto nenhuma correção apontar pra ele.
create view vw_custo_por_animal as
with custos_validos as (
  select c.*
  from custos c
  where not exists (
    select 1 from custos c2 where c2.custo_original_id = c.id
  )
),
custos_diretos as (
  select animal_id, sum(valor) as valor
  from custos_validos
  where animal_id is not null
  group by animal_id
),
animais_por_lote as (
  select lote_id, count(*) as total_animais
  from animais
  where lote_id is not null
  group by lote_id
),
custos_lote_rateado as (
  select a.id as animal_id, sum(c.valor / apl.total_animais) as valor
  from animais a
  join animais_por_lote apl on apl.lote_id = a.lote_id
  join custos_validos c on c.lote_id = a.lote_id
  group by a.id
)
select
  a.id as animal_id,
  a.numero_ferro,
  coalesce(cd.valor, 0) + coalesce(cl.valor, 0) as custo_acumulado
from animais a
left join custos_diretos cd on cd.animal_id = a.id
left join custos_lote_rateado cl on cl.animal_id = a.id;

-- Uma venda "vale" enquanto nenhuma correção apontar pra ela.
create view vw_resultado_animal as
with vendas_validas as (
  select v.*
  from vendas v
  where not exists (
    select 1 from vendas v2 where v2.venda_original_id = v.id
  )
)
select
  a.id as animal_id,
  a.numero_ferro,
  a.status,
  a.data_entrada,
  a.valor_total_compra,
  vc.custo_acumulado,
  (a.valor_total_compra + vc.custo_acumulado) as custo_total,
  v.data_venda,
  v.valor_total_venda,
  v.peso_saida_arr,
  a.peso_entrada_arr,
  (v.peso_saida_arr - a.peso_entrada_arr) as ganho_peso_arr,
  (v.data_venda - a.data_entrada) as dias_na_fazenda,
  case when v.valor_total_venda is not null
       then v.valor_total_venda - (a.valor_total_compra + vc.custo_acumulado)
       else null end as lucro,
  case when v.valor_total_venda is not null and (a.valor_total_compra + vc.custo_acumulado) > 0
       then round(100 * (v.valor_total_venda - (a.valor_total_compra + vc.custo_acumulado)) / (a.valor_total_compra + vc.custo_acumulado), 1)
       else null end as margem_pct,
  case when v.peso_saida_arr > 0
       then round((a.valor_total_compra + vc.custo_acumulado) / v.peso_saida_arr, 2)
       else null end as custo_por_arroba,
  a.lote_id,
  l.nome as lote_nome
from animais a
left join vw_custo_por_animal vc on vc.animal_id = a.id
left join vendas_validas v on v.animal_id = a.id
left join lotes l on l.id = a.lote_id;

create view vw_animais_em_aberto as
select
  a.*,
  (current_date - a.data_entrada) as dias_na_fazenda,
  coalesce(vc.custo_acumulado, 0) as custo_acumulado
from animais a
left join vw_custo_por_animal vc on vc.animal_id = a.id
where a.status = 'ativo';
