/* Rookies Cafe — v10 public review summary
   SAFE, additive migration: does not drop, truncate, or change any table or row.
   Run once in Supabase > SQL Editor. Safe to re-run.

   Customers can't read the `messages` table (reviews live there), so this function lets the public
   Feedback page show ONLY aggregate numbers: how many reviews, the average per category and the
   1–5 star spread. No names, emails, comments or voucher codes are ever returned.
*/
create or replace function review_summary() returns jsonb
language plpgsql security definer set search_path = public stable as $$
declare
  m record;
  data jsonb;
  f text;
  v numeric;
  total int := 0;
  fields text[] := array['overall','service','food','ambiance','value'];
  sums jsonb := '{}'::jsonb;
  cnts jsonb := '{}'::jsonb;
  dist jsonb := '{"1":0,"2":0,"3":0,"4":0,"5":0}'::jsonb;
  avgs jsonb := '{}'::jsonb;
  star text;
begin
  foreach f in array fields loop
    sums := sums || jsonb_build_object(f, 0);
    cnts := cnts || jsonb_build_object(f, 0);
  end loop;

  for m in select message from messages where message like 'REVIEW::%' loop
    begin
      data := substr(m.message, 9)::jsonb -> 'ratings';
    exception when others then
      continue; -- ignore malformed rows instead of breaking the summary
    end;
    if data is null or jsonb_typeof(data) <> 'object' then continue; end if;

    total := total + 1;
    foreach f in array fields loop
      begin
        v := (data ->> f)::numeric;
      exception when others then
        v := null;
      end;
      if v is not null and v between 1 and 5 then
        sums := jsonb_set(sums, array[f], to_jsonb((sums ->> f)::numeric + v));
        cnts := jsonb_set(cnts, array[f], to_jsonb((cnts ->> f)::int + 1));
        if f = 'overall' then
          star := round(v)::int::text;
          dist := jsonb_set(dist, array[star], to_jsonb((dist ->> star)::int + 1));
        end if;
      end if;
    end loop;
  end loop;

  foreach f in array fields loop
    avgs := avgs || jsonb_build_object(
      f,
      case when (cnts ->> f)::int > 0
           then round((sums ->> f)::numeric / (cnts ->> f)::int, 2)
           else 0 end
    );
  end loop;

  return jsonb_build_object('count', total, 'averages', avgs, 'distribution', dist);
end $$;

grant execute on function review_summary() to anon, authenticated;
