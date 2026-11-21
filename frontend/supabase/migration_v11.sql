/* Rookies Cafe — v11 owner chooses which reviews customers see
   SAFE, additive migration: does not drop, truncate, or change any existing row.
   Run once in Supabase > SQL Editor. Safe to re-run. It replaces v10's review_summary(),
   so you can run this even if you already ran v10.

   - messages.show_public: the owner switches a review on to include it in the public
     "What our customers say" section. Default false (nothing is shown until the owner opts in).
   - review_summary(): now counts ONLY switched-on reviews and also returns them (first name +
     last initial, overall stars, comment, date) for the Feedback page. Emails and voucher codes
     are never returned.
*/
alter table public.messages
  add column if not exists show_public boolean not null default false;

create or replace function review_summary() returns jsonb
language plpgsql security definer set search_path = public stable as $$
declare
  m record;
  ratings jsonb;
  cmt text;
  f text;
  v numeric;
  total int := 0;
  fields text[] := array['overall','service','food','ambiance','value'];
  sums jsonb := '{}'::jsonb;
  cnts jsonb := '{}'::jsonb;
  dist jsonb := '{"1":0,"2":0,"3":0,"4":0,"5":0}'::jsonb;
  avgs jsonb := '{}'::jsonb;
  items jsonb := '[]'::jsonb;
  star text;
  clean text;
  short_name text;
  ov numeric;
begin
  foreach f in array fields loop
    sums := sums || jsonb_build_object(f, 0);
    cnts := cnts || jsonb_build_object(f, 0);
  end loop;

  for m in
    select name, message, created_at from messages
    where message like 'REVIEW::%' and show_public = true
    order by created_at desc
  loop
    begin
      ratings := (substr(m.message, 9)::jsonb) -> 'ratings';
      cmt := (substr(m.message, 9)::jsonb) ->> 'comment';
    exception when others then
      continue; -- ignore malformed rows instead of breaking the summary
    end;
    if ratings is null or jsonb_typeof(ratings) <> 'object' then continue; end if;

    total := total + 1;
    ov := null;
    foreach f in array fields loop
      begin
        v := (ratings ->> f)::numeric;
      exception when others then
        v := null;
      end;
      if v is not null and v between 1 and 5 then
        sums := jsonb_set(sums, array[f], to_jsonb((sums ->> f)::numeric + v));
        cnts := jsonb_set(cnts, array[f], to_jsonb((cnts ->> f)::int + 1));
        if f = 'overall' then
          ov := v;
          star := round(v)::int::text;
          dist := jsonb_set(dist, array[star], to_jsonb((dist ->> star)::int + 1));
        end if;
      end if;
    end loop;

    clean := left(trim(coalesce(cmt, '')), 500);
    if clean <> '' and ov is not null and jsonb_array_length(items) < 30 then
      clean := trim(m.name);
      short_name := split_part(clean, ' ', 1) ||
        case when position(' ' in clean) > 0
             then ' ' || upper(left(regexp_replace(clean, '^.*\s', ''), 1)) || '.'
             else '' end;
      items := items || jsonb_build_array(jsonb_build_object(
        'name', left(short_name, 40),
        'overall', ov,
        'comment', left(trim(cmt), 500),
        'created_at', m.created_at
      ));
    end if;
  end loop;

  foreach f in array fields loop
    avgs := avgs || jsonb_build_object(
      f,
      case when (cnts ->> f)::int > 0
           then round((sums ->> f)::numeric / (cnts ->> f)::int, 2)
           else 0 end
    );
  end loop;

  return jsonb_build_object('count', total, 'averages', avgs, 'distribution', dist, 'reviews', items);
end $$;

grant execute on function review_summary() to anon, authenticated;
