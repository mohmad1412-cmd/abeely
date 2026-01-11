-- Add images column to requests table if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'requests' and column_name = 'images') then
    alter table "requests" add column "images" text[] default '{}';
  end if;
end $$;

-- Add images column to offers table if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'offers' and column_name = 'images') then
    alter table "offers" add column "images" text[] default '{}';
  end if;
end $$;
