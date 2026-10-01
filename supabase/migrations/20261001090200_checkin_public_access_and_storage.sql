-- Guest digital check-in and private storage.
--
-- Guests are not authenticated: the 64-character random token of their
-- check-in link is the only credential. The anon role never gets table
-- access; it can only call the functions below, which check the token,
-- expiry and status on every call, and upload files into the folder named
-- after a valid token in the private guest-documents bucket.

-- ==========================================================================
-- 1. Token checks
-- ==========================================================================

create function public.checkin_token_is_open(p_token text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_token is not null
     and length(p_token) = 64
     and exists (
       select 1 from public.checkins c
       where c.token = p_token
         and c.expires_at > now()
         and c.status in ('PENDING', 'IN_PROGRESS', 'REJECTED')
     );
$$;

-- Object names must be "<token>/<document|selfie|signature>-<file>".
create function public.checkin_upload_allowed(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select array_length(string_to_array(p_object_name, '/'), 1) = 2
     and split_part(p_object_name, '/', 2) ~ '^(document|selfie|signature)-[A-Za-z0-9._-]{1,120}$'
     and public.checkin_token_is_open(split_part(p_object_name, '/', 1));
$$;

-- ==========================================================================
-- 2. Guest-facing RPCs
-- ==========================================================================

create function public.checkin_get(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_row record;
  v_settings public.checkin_settings%rowtype;
begin
  if p_token is null or length(p_token) <> 64 then
    return null;
  end if;

  select c.status, c.expires_at, c.review_notes, c.guest_full_name,
         r.reference, r.check_in, r.check_out, r.guests_count, r.smart_lock_code,
         p.name as property_name, p.address as property_address, p.city as property_city,
         p.type as property_type, p.house_rules,
         g.first_name as guest_first_name, g.last_name as guest_last_name
  into v_row
  from public.checkins c
  join public.reservations r on r.id = c.reservation_id
  join public.properties p on p.id = r.property_id
  left join public.guests g on g.id = r.guest_id
  where c.token = p_token
    and r.status not in ('CANCELLED', 'NO_SHOW');

  if not found or v_row.expires_at <= now() then
    return null;
  end if;

  select * into v_settings from public.checkin_settings limit 1;

  return jsonb_build_object(
    'status', v_row.status,
    'reviewNotes', case when v_row.status = 'REJECTED' then v_row.review_notes end,
    'reservation', jsonb_build_object(
      'reference', v_row.reference,
      'checkIn', v_row.check_in,
      'checkOut', v_row.check_out,
      'guestsCount', v_row.guests_count
    ),
    'property', jsonb_build_object(
      'name', v_row.property_name,
      'address', v_row.property_address,
      'city', v_row.property_city,
      'type', v_row.property_type,
      'houseRules', v_row.house_rules
    ),
    'guestName', coalesce(
      v_row.guest_full_name,
      nullif(btrim(coalesce(v_row.guest_first_name, '') || ' ' || coalesce(v_row.guest_last_name, '')), '')
    ),
    'settings', jsonb_build_object(
      'documentStep', coalesce(v_settings.document_step, true),
      'selfieStep', coalesce(v_settings.selfie_step, true),
      'contractStep', coalesce(v_settings.contract_step, true),
      'documentNumberRequired', coalesce(v_settings.document_number_required, false),
      'welcomeMessage', coalesce(v_settings.welcome_message, '')
    ),
    'contractTemplate', (select t.body from public.contract_templates t where t.is_active limit 1),
    -- The access code is only revealed once DarnaLux has verified the guest.
    'smartLockCode', case when v_row.status = 'VERIFIED' then v_row.smart_lock_code end
  );
end;
$$;

create function public.checkin_start(p_token text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.checkins
  set status = 'IN_PROGRESS'
  where token = p_token and status = 'PENDING' and expires_at > now();
$$;

create function public.checkin_submit(p_token text, p_payload jsonb)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_checkin public.checkins%rowtype;
  v_settings public.checkin_settings%rowtype;
  v_full_name text := btrim(coalesce(p_payload ->> 'fullName', ''));
  v_document_type text := nullif(p_payload ->> 'documentType', '');
  v_document_number text := nullif(btrim(coalesce(p_payload ->> 'documentNumber', '')), '');
  v_document_path text := nullif(p_payload ->> 'documentPath', '');
  v_selfie_path text := nullif(p_payload ->> 'selfiePath', '');
  v_signature_path text := nullif(p_payload ->> 'signaturePath', '');
  v_contract text := nullif(p_payload ->> 'contractSnapshot', '');
  v_consent boolean := coalesce((p_payload ->> 'consent')::boolean, false);
begin
  select * into v_checkin from public.checkins where token = p_token for update;
  if not found
     or v_checkin.expires_at <= now()
     or v_checkin.status not in ('PENDING', 'IN_PROGRESS', 'REJECTED') then
    raise exception 'Lien de check-in invalide ou expiré' using errcode = 'P0001';
  end if;

  select * into v_settings from public.checkin_settings limit 1;

  if length(v_full_name) < 3 or length(v_full_name) > 120 then
    raise exception 'Nom complet invalide' using errcode = '22023';
  end if;
  if v_document_type is not null and v_document_type not in ('ID_CARD', 'PASSPORT', 'DRIVING_LICENSE') then
    raise exception 'Type de document invalide' using errcode = '22023';
  end if;
  -- Uploaded files must belong to this link's folder.
  if (v_document_path is not null and split_part(v_document_path, '/', 1) <> p_token)
     or (v_selfie_path is not null and split_part(v_selfie_path, '/', 1) <> p_token)
     or (v_signature_path is not null and split_part(v_signature_path, '/', 1) <> p_token) then
    raise exception 'Fichier invalide' using errcode = '22023';
  end if;
  if coalesce(v_settings.document_step, true) and (v_document_path is null or v_document_type is null) then
    raise exception 'La pièce d''identité est requise' using errcode = '22023';
  end if;
  if coalesce(v_settings.document_number_required, false) and v_document_number is null then
    raise exception 'Le numéro de pièce est requis' using errcode = '22023';
  end if;
  if coalesce(v_settings.selfie_step, true) and v_selfie_path is null then
    raise exception 'Le selfie est requis' using errcode = '22023';
  end if;
  if coalesce(v_settings.contract_step, true) and (v_signature_path is null or v_contract is null or not v_consent) then
    raise exception 'La signature du contrat est requise' using errcode = '22023';
  end if;

  update public.checkins
  set guest_full_name = left(v_full_name, 120),
      guest_email = left(nullif(btrim(coalesce(p_payload ->> 'email', '')), ''), 254),
      guest_phone = left(nullif(btrim(coalesce(p_payload ->> 'phone', '')), ''), 40),
      nationality = left(nullif(btrim(coalesce(p_payload ->> 'nationality', '')), ''), 60),
      document_type = v_document_type,
      document_number = left(v_document_number, 60),
      document_path = v_document_path,
      selfie_path = v_selfie_path,
      signature_path = v_signature_path,
      consent_given_at = case when v_consent then now() end,
      contract_snapshot = left(v_contract, 20000),
      signed_at = case when v_signature_path is not null then now() end,
      user_agent = left(p_payload ->> 'userAgent', 300),
      submitted_at = now(),
      review_notes = null,
      status = 'SUBMITTED'
  where id = v_checkin.id;

  return 'SUBMITTED';
end;
$$;

revoke all on function public.checkin_token_is_open(text) from public;
revoke all on function public.checkin_upload_allowed(text) from public;
revoke all on function public.checkin_get(text) from public;
revoke all on function public.checkin_start(text) from public;
revoke all on function public.checkin_submit(text, jsonb) from public;
grant execute on function public.checkin_token_is_open(text) to anon, authenticated;
grant execute on function public.checkin_upload_allowed(text) to anon, authenticated;
grant execute on function public.checkin_get(text) to anon, authenticated;
grant execute on function public.checkin_start(text) to anon, authenticated;
grant execute on function public.checkin_submit(text, jsonb) to anon, authenticated;

-- ==========================================================================
-- 3. Storage buckets (all private; files are served through signed URLs)
-- ==========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('documents', 'documents', false, 10485760, array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]),
  ('property-images', 'property-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('guest-documents', 'guest-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create function public.document_object_readable(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.documents d
    where d.storage_path = p_object_name
      and d.visible_to_owner
      and (d.owner_id = public.current_owner_id()
           or (d.property_id is not null and public.owns_property(d.property_id)))
  );
$$;

-- Property images are stored as "<property_id>/<file>".
create function public.property_image_readable(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_property_id uuid;
begin
  begin
    v_property_id := split_part(p_object_name, '/', 1)::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return public.owns_property(v_property_id);
end;
$$;

revoke all on function public.document_object_readable(text) from public, anon;
revoke all on function public.property_image_readable(text) from public, anon;
grant execute on function public.document_object_readable(text) to authenticated;
grant execute on function public.property_image_readable(text) to authenticated;

create policy documents_bucket_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (public.has_permission('documents.view') or public.document_object_readable(name)));
create policy documents_bucket_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.has_permission('documents.manage'));
create policy documents_bucket_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.has_permission('documents.manage'));

create policy property_images_bucket_select on storage.objects for select to authenticated
  using (bucket_id = 'property-images' and (public.has_permission('properties.view') or public.property_image_readable(name)));
create policy property_images_bucket_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'property-images' and public.has_permission('properties.manage'));
create policy property_images_bucket_delete on storage.objects for delete to authenticated
  using (bucket_id = 'property-images' and public.has_permission('properties.manage'));

-- Guests (anon) may only create objects inside a valid, open check-in folder;
-- they can never list, read, overwrite or delete them.
create policy guest_documents_bucket_insert on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'guest-documents' and public.checkin_upload_allowed(name));
create policy guest_documents_bucket_select on storage.objects for select to authenticated
  using (bucket_id = 'guest-documents' and public.has_permission('checkins.view'));
create policy guest_documents_bucket_delete on storage.objects for delete to authenticated
  using (bucket_id = 'guest-documents' and public.has_permission('checkins.manage'));

-- Check-out inspection photos reuse the documents bucket under "checkouts/".
create policy checkout_photos_bucket_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and name like 'checkouts/%'
    and (public.has_permission('checkins.manage') or public.has_permission('tasks.execute'))
  );
