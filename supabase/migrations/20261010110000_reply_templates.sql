-- Predefined reply templates for landing-page requests, plus reply tracking.
--
-- Templates are managed by marketing staff and use {{placeholders}} filled in
-- the browser (see fillTemplate in @darnalux/core). Reply tracking records
-- that staff opened an e-mail or WhatsApp reply; it does not prove delivery.

-- ==========================================================================
-- 1. Templates
-- ==========================================================================

create table public.reply_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  applies_to text not null default 'ALL' check (applies_to in ('ALL', 'QUOTE', 'CONTACT')),
  subject text not null default '' check (char_length(subject) <= 160),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reply_templates_set_updated_at
  before update on public.reply_templates
  for each row execute function public.set_updated_at();

alter table public.reply_templates enable row level security;

revoke all on public.reply_templates from public, anon, authenticated;
grant select, insert, update, delete on public.reply_templates to authenticated;

create policy reply_templates_select on public.reply_templates
  for select to authenticated
  using (public.has_permission('marketing.view'));

create policy reply_templates_insert on public.reply_templates
  for insert to authenticated
  with check (public.has_permission('marketing.manage'));

create policy reply_templates_update on public.reply_templates
  for update to authenticated
  using (public.has_permission('marketing.manage'))
  with check (public.has_permission('marketing.manage'));

create policy reply_templates_delete on public.reply_templates
  for delete to authenticated
  using (public.has_permission('marketing.manage'));

-- Starter templates (editable by staff). Wording is neutral and makes no
-- promise on delay or price.
insert into public.reply_templates (name, applies_to, subject, body) values
  (
    'Accusé de réception — estimation',
    'QUOTE',
    'Votre demande d''estimation DarnaLux',
    E'Bonjour {{prenom}},\n\nMerci pour votre demande d''estimation concernant votre bien ({{configuration}}, {{adresse}}, {{zone}}).\n\nNotre équipe étudie votre dossier et revient vers vous avec une analyse adaptée.\n\n{{equipe}}'
  ),
  (
    'Envoi du devis',
    'QUOTE',
    'Votre devis DarnaLux',
    E'Bonjour {{prenom}},\n\nComme convenu, voici notre proposition pour la gestion de votre bien ({{configuration}}, {{adresse}}).\n\n{{estimation}}\n\nNous restons à votre disposition pour en discuter.\n\n{{equipe}}'
  ),
  (
    'Réponse à un message',
    'CONTACT',
    'Votre message à DarnaLux',
    E'Bonjour {{prenom}},\n\nMerci pour votre message. \n\n{{equipe}}'
  ),
  (
    'Relance',
    'ALL',
    'Suite à votre demande',
    E'Bonjour {{prenom}},\n\nNous revenons vers vous suite à votre demande. Souhaitez-vous que nous en parlions ?\n\n{{equipe}}'
  );

-- ==========================================================================
-- 2. Reply tracking on requests
-- ==========================================================================

alter table public.contact_requests
  add column last_reply_channel text check (last_reply_channel is null or last_reply_channel in ('EMAIL', 'WHATSAPP')),
  add column last_reply_at timestamptz;

grant update (last_reply_channel, last_reply_at) on public.contact_requests to authenticated;
