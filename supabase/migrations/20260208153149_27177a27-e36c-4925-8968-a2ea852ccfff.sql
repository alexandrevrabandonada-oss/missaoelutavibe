
create or replace function public.public_validate_invite(p_code text)
returns table(
  ok boolean,
  reason text,
  code text,
  channel text,
  campaign_tag text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_code,'')));
  v_table text;
  v_has_is_active boolean;
  v_has_active boolean;
  v_has_status boolean;
  v_has_expires_at boolean;
  v_has_expires_on boolean;
  v_has_channel boolean;
  v_has_campaign_tag boolean;
  v_sql text;
  v_rec record;
  v_is_active boolean;
  v_expires_at timestamptz;
begin
  code := v_code;
  channel := null;
  campaign_tag := null;

  if v_code = '' then
    ok := false;
    reason := 'EMPTY';
    return next;
    return;
  end if;

  select c.table_name
    into v_table
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.column_name = 'code'
  group by c.table_name
  order by (c.table_name = 'invites') desc, c.table_name asc
  limit 1;

  if v_table is null then
    ok := false;
    reason := 'NO_TABLE';
    return next;
    return;
  end if;

  select exists(select 1 from information_schema.columns where table_schema='public' and table_name=v_table and column_name='is_active') into v_has_is_active;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name=v_table and column_name='active') into v_has_active;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name=v_table and column_name='status') into v_has_status;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name=v_table and column_name='expires_at') into v_has_expires_at;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name=v_table and column_name='expires_on') into v_has_expires_on;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name=v_table and column_name='channel') into v_has_channel;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name=v_table and column_name='campaign_tag') into v_has_campaign_tag;

  v_sql :=
    'select ' ||
    'code::text as code,' ||
    case when v_has_channel then 'channel::text as channel,' else 'null::text as channel,' end ||
    case when v_has_campaign_tag then 'campaign_tag::text as campaign_tag,' else 'null::text as campaign_tag,' end ||
    case
      when v_has_is_active then 'coalesce(is_active,true) as is_active,'
      when v_has_active then 'coalesce(active,true) as is_active,'
      when v_has_status then '(upper(status) in (''ACTIVE'',''ATIVO'')) as is_active,'
      else 'true as is_active,'
    end ||
    case
      when v_has_expires_at then 'expires_at::timestamptz as expires_at'
      when v_has_expires_on then 'expires_on::timestamptz as expires_at'
      else 'null::timestamptz as expires_at'
    end ||
    ' from ' || quote_ident(v_table) ||
    ' where upper(trim(code)) = $1 limit 1';

  execute v_sql into v_rec using v_code;

  if v_rec is null then
    ok := false;
    reason := 'NOT_FOUND';
    return next;
    return;
  end if;

  channel := v_rec.channel;
  campaign_tag := v_rec.campaign_tag;
  v_is_active := coalesce(v_rec.is_active, true);
  v_expires_at := v_rec.expires_at;

  if v_is_active is distinct from true then
    ok := false;
    reason := 'INACTIVE';
    return next;
    return;
  end if;

  if v_expires_at is not null and v_expires_at <= now() then
    ok := false;
    reason := 'EXPIRED';
    return next;
    return;
  end if;

  ok := true;
  reason := 'OK';
  return next;
end;
$$;

grant execute on function public.public_validate_invite(text) to anon, authenticated;
