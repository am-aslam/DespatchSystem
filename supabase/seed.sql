insert into public.settings (key, value)
values
  ('company_name', 'AURUM JEWELLERS PVT LTD'),
  ('address', 'Gold Bazaar Road, Zaveri Market, Mumbai'),
  ('gstin', '27AAAAA0000A1Z5'),
  ('weight_decimals', '3')
on conflict (key) do update
set value = excluded.value,
    updated_at = now();
