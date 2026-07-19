-- Fazenda Santos, modulo financeiro
-- Rode este arquivo inteiro no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

-- dados extras dos usuarios (auth.users ja cuida de email e senha)
create table if not exists perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null,
  papel      text not null check (papel in ('socio', 'campo')),
  criado_em  timestamptz not null default now()
);

create table if not exists lotes (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null,
  data_compra        date,
  valor_arroba_lote  numeric(10,2),
  observacao         text,
  criado_por         uuid references auth.users(id),
  criado_em          timestamptz not null default now()
);

create table if not exists animais (
  id                    uuid primary key default gen_random_uuid(),
  numero_ferro          bigint not null unique,
  data_entrada          date not null,
  peso_entrada_arr      numeric(10,2) not null,
  valor_arroba_compra   numeric(10,2) not null,
  valor_total_compra    numeric(12,2) generated always as (peso_entrada_arr * valor_arroba_compra) stored,
  lote_id               uuid references lotes(id),
  peso_alvo_arr         numeric(10,2),
  custo_medio_mensal    numeric(10,2),
  observacao            text,
  status                text not null default 'ativo' check (status in ('ativo', 'vendido', 'perda')),
  perda_motivo          text,
  perda_em              date,
  criado_por            uuid references auth.users(id),
  criado_em             timestamptz not null default now()
);

create index if not exists idx_animais_status on animais(status);
create index if not exists idx_animais_lote on animais(lote_id);

-- um custo pertence a um animal ou a um lote inteiro, nunca aos dois nem a nenhum
-- correcao nunca apaga o lancamento original, so referencia ele com justificativa
create table if not exists custos (
  id                 uuid primary key default gen_random_uuid(),
  animal_id          uuid references animais(id),
  lote_id            uuid references lotes(id),
  categoria          text not null check (categoria in ('racao','sal_mineral','veterinario','vacina','transporte','outro')),
  valor              numeric(10,2) not null,
  data               date not null,
  descricao          text,
  lancado_por        uuid references auth.users(id),
  lancado_em         timestamptz not null default now(),
  sincronizado       boolean not null default true,
  custo_original_id  uuid references custos(id),
  justificativa      text,
  constraint chk_custo_alvo check (
    (animal_id is not null and lote_id is null) or
    (animal_id is null and lote_id is not null)
  ),
  constraint chk_correcao_justificada check (
    custo_original_id is null or justificativa is not null
  )
);

create index if not exists idx_custos_animal on custos(animal_id);
create index if not exists idx_custos_lote on custos(lote_id);

create table if not exists vendas (
  id                  uuid primary key default gen_random_uuid(),
  animal_id           uuid not null references animais(id),
  data_venda          date not null,
  peso_saida_arr      numeric(10,2) not null,
  valor_arroba_venda  numeric(10,2) not null,
  valor_total_venda   numeric(12,2) generated always as (peso_saida_arr * valor_arroba_venda) stored,
  comprador           text,
  lancado_por         uuid references auth.users(id),
  lancado_em          timestamptz not null default now(),
  sincronizado        boolean not null default true,
  venda_original_id   uuid references vendas(id),
  justificativa       text,
  constraint chk_correcao_venda_justificada check (
    venda_original_id is null or justificativa is not null
  )
);

create index if not exists idx_vendas_animal on vendas(animal_id);

-- ao registrar uma venda, o animal passa para vendido automaticamente
create or replace function fn_marcar_animal_vendido()
returns trigger
language plpgsql
security definer
as $$
begin
  update animais set status = 'vendido' where id = new.animal_id;
  return new;
end;
$$;

drop trigger if exists trg_marcar_vendido on vendas;
create trigger trg_marcar_vendido
  after insert on vendas
  for each row
  execute function fn_marcar_animal_vendido();

-- custo acumulado por animal, ja com o rateio de custo de lote aplicado
create or replace view vw_custo_por_animal as
with custos_diretos as (
  select animal_id, sum(valor) as valor
  from custos
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
  join custos c on c.lote_id = a.lote_id
  group by a.id
)
select
  a.id as animal_id,
  a.numero_ferro,
  coalesce(cd.valor, 0) + coalesce(cl.valor, 0) as custo_acumulado
from animais a
left join custos_diretos cd on cd.animal_id = a.id
left join custos_lote_rateado cl on cl.animal_id = a.id;

create or replace view vw_resultado_animal as
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
       else null end as custo_por_arroba
from animais a
left join vw_custo_por_animal vc on vc.animal_id = a.id
left join vendas v on v.animal_id = a.id and v.venda_original_id is null;

create or replace view vw_animais_em_aberto as
select
  a.*,
  (current_date - a.data_entrada) as dias_na_fazenda,
  coalesce(vc.custo_acumulado, 0) as custo_acumulado
from animais a
left join vw_custo_por_animal vc on vc.animal_id = a.id
where a.status = 'ativo';

-- os tres usuarios tem o mesmo nivel de acesso
-- nenhuma policy de delete e criada, entao apagar registro fica bloqueado no banco
alter table perfis enable row level security;
alter table lotes  enable row level security;
alter table animais enable row level security;
alter table custos  enable row level security;
alter table vendas  enable row level security;

create policy "select_all_authenticated" on perfis  for select to authenticated using (true);
create policy "select_all_authenticated" on lotes   for select to authenticated using (true);
create policy "select_all_authenticated" on animais for select to authenticated using (true);
create policy "select_all_authenticated" on custos  for select to authenticated using (true);
create policy "select_all_authenticated" on vendas  for select to authenticated using (true);

create policy "insert_all_authenticated" on lotes   for insert to authenticated with check (true);
create policy "insert_all_authenticated" on animais for insert to authenticated with check (true);
create policy "insert_all_authenticated" on custos  for insert to authenticated with check (true);
create policy "insert_all_authenticated" on vendas  for insert to authenticated with check (true);

create policy "update_status_authenticated" on animais for update to authenticated using (true) with check (true);
