-- Roda isso uma vez no SQL Editor do Supabase.
-- Cria o perfil automaticamente sempre que alguém termina o cadastro pelo app,
-- usando o nome e a função que a pessoa preencheu no formulário.

create or replace function fn_criar_perfil_ao_cadastrar()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into perfis (id, nome, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'papel', 'socio')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_criar_perfil on auth.users;
create trigger trg_criar_perfil
  after insert on auth.users
  for each row
  execute function fn_criar_perfil_ao_cadastrar();
