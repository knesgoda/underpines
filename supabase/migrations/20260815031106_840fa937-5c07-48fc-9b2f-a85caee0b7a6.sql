create or replace function public.can_upload_entity_cover(_bucket text, _name text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  parts text[] := storage.foldername(_name);
  entity uuid;
begin
  if auth.uid() is null then
    return false;
  end if;
  if array_length(parts, 1) is distinct from 2 then
    return false;
  end if;
  if parts[1] is distinct from auth.uid()::text then
    return false;
  end if;

  begin
    entity := parts[2]::uuid;
  exception when others then
    return false;
  end;

  if _bucket = 'camp-covers' then
    return public.has_camp_role(entity, auth.uid(), array['firekeeper', 'trailblazer']);
  elsif _bucket = 'design-previews' then
    return exists (
      select 1 from public.cabin_designs d
       where d.id = entity and d.creator_id = auth.uid()
    );
  end if;

  return false;
end;
$$;

revoke all on function public.can_upload_entity_cover(text, text) from anon;
grant execute on function public.can_upload_entity_cover(text, text) to authenticated;

drop policy if exists "Members can upload camp covers to their own folder" on storage.objects;
drop policy if exists "Authenticated users can upload camp covers" on storage.objects;
drop policy if exists "Members can upload design previews to their own folder" on storage.objects;
drop policy if exists "Authenticated users can upload design previews" on storage.objects;

create policy "Camp covers upload requires camp ownership"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'camp-covers'
    and public.can_upload_entity_cover('camp-covers', name)
  );

create policy "Design previews upload requires design ownership"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'design-previews'
    and public.can_upload_entity_cover('design-previews', name)
  );

drop policy if exists "feedback_votes_member_select" on public.feedback_votes;

create policy "feedback_votes_own_or_author_select"
  on public.feedback_votes for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.feedback_items i
       where i.id = feedback_votes.item_id and i.author_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

create or replace function public.get_feedback_vote_counts()
returns table (item_id uuid, vote_count integer)
language sql
stable
security definer
set search_path to 'public'
as $$
  select v.item_id, count(*)::integer
    from public.feedback_votes v
   group by v.item_id
$$;

revoke all on function public.get_feedback_vote_counts() from anon;
grant execute on function public.get_feedback_vote_counts() to authenticated;