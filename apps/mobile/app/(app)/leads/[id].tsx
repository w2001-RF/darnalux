import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  LEAD_KIND_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONES,
  PERMISSIONS,
  fillTemplate,
  hasPermission,
  leadTemplateValues,
} from '@darnalux/core';
import type { LeadStatus } from '@darnalux/core';
import { toUserMessage } from '@darnalux/data/errors';
import { getLead, listReplyTemplates, updateLead } from '@darnalux/data/leads';
import { Screen } from '../../../src/components/Screen';
import { Badge, Banner, Button, Chips, Facts, Field, Loading, SectionTitle } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { Guard } from '../../../src/features/auth/Guard';
import { formatDateTime } from '../../../src/lib/format';
import { callPhone, openMail, openWhatsapp } from '../../../src/lib/links';
import { useAsync } from '../../../src/lib/useAsync';
import { spacing, useTheme } from '../../../src/theme';

const MAD = (value: number) => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export default function LeadDetailScreen() {
  return (
    <Guard anyOf={[PERMISSIONS.MARKETING_VIEW]}>
      <LeadDetail />
    </Guard>
  );
}

function LeadDetail() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useTheme();
  const canManage = hasPermission(user, PERMISSIONS.MARKETING_MANAGE);
  const lead = useAsync(() => getLead(id), [id]);
  const templates = useAsync(() => listReplyTemplates().catch(() => []), []);

  const [status, setStatus] = useState<LeadStatus>('NEW');
  const [notes, setNotes] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const data = lead.data;
  const values = useMemo(() => (data ? leadTemplateValues(data) : {}), [data]);
  const applicable = useMemo(
    () => (templates.data ?? []).filter((t) => data && (t.applies_to === 'ALL' || t.applies_to === data.kind)),
    [templates.data, data],
  );

  useEffect(() => {
    if (data) {
      setStatus(data.status);
      setNotes(data.notes ?? '');
    }
  }, [data]);

  // Preselect the first applicable template once both the lead and the templates are loaded.
  useEffect(() => {
    if (templateId === '' && applicable.length > 0) {
      const first = applicable[0];
      setTemplateId(first.id);
      setSubject(fillTemplate(first.subject, values));
      setBody(fillTemplate(first.body, values));
    }
  }, [applicable, templateId, values]);

  if (lead.loading && !data) return <Loading />;
  if (lead.error || !data) {
    return (
      <Screen insetBottom>
        <Banner message={lead.error ?? 'Demande introuvable.'} />
      </Screen>
    );
  }
  const l = data;

  function pickTemplate(idToUse: string) {
    setTemplateId(idToUse);
    const t = applicable.find((x) => x.id === idToUse);
    if (t) {
      setSubject(fillTemplate(t.subject, values));
      setBody(fillTemplate(t.body, values));
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await updateLead(l.id, { status, notes: notes.trim() === '' ? null : notes });
      lead.reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Records that a reply was opened (not that it was delivered).
  async function markReplied(channel: 'EMAIL' | 'WHATSAPP') {
    if (!canManage) return;
    try {
      await updateLead(l.id, {
        last_reply_channel: channel,
        last_reply_at: new Date().toISOString(),
        ...(l.status === 'NEW' ? { status: 'IN_PROGRESS' as const } : {}),
      });
      lead.reload();
    } catch (e) {
      setError(toUserMessage(e));
    }
  }

  async function replyByEmail() {
    await openMail(l.email, subject, body);
    void markReplied('EMAIL');
  }

  async function replyByWhatsapp() {
    const opened = await openWhatsapp(l.phone, body);
    if (!opened) {
      Alert.alert('WhatsApp indisponible', 'Cette demande n’a pas de numéro de téléphone valide.');
      return;
    }
    void markReplied('WHATSAPP');
  }

  return (
    <Screen insetBottom contentStyle={styles.content} onRefresh={lead.reload} refreshing={lead.loading}>
      <Stack.Screen options={{ title: LEAD_KIND_LABELS[l.kind] }} />
      <View style={styles.badges}>
        <Badge tone={LEAD_STATUS_TONES[l.status]} label={LEAD_STATUS_LABELS[l.status]} />
        <Badge label={LEAD_KIND_LABELS[l.kind]} />
      </View>
      {error ? <Banner message={error} /> : null}

      <Facts
        items={[
          { label: 'Nom', value: l.full_name },
          { label: 'E-mail', value: l.email },
          { label: 'Téléphone', value: l.phone ?? '—' },
          { label: 'Reçue le', value: formatDateTime(l.created_at) },
          ...(l.kind === 'QUOTE'
            ? [
                { label: 'Zone', value: l.zone_label ?? '—' },
                { label: 'Adresse', value: l.address ?? '—' },
                { label: 'Configuration', value: l.config_label ?? '—' },
                { label: 'Situation actuelle', value: l.situation ?? '—' },
                { label: 'Accompagnement', value: l.support ?? '—' },
                { label: 'Créneau souhaité', value: l.preferred_slot ?? '—' },
                {
                  label: 'Estimation affichée',
                  value: l.estimate_low !== null && l.estimate_high !== null ? `${MAD(l.estimate_low)} – ${MAD(l.estimate_high)} MAD / mois` : 'Analyse sur mesure',
                },
              ]
            : []),
        ]}
      />
      {l.message ? (
        <View style={[styles.message, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, lineHeight: 22 }}>{l.message}</Text>
        </View>
      ) : null}

      {l.phone ? <Button label={`Appeler ${l.phone}`} variant="ghost" onPress={() => void callPhone(l.phone ?? '')} /> : null}

      <SectionTitle title="Suivi" />
      <Chips
        options={LEAD_STATUSES.map((s) => ({ id: s, label: LEAD_STATUS_LABELS[s] }))}
        value={status}
        onChange={(s) => (canManage ? setStatus(s) : undefined)}
      />
      <Field label="Notes internes" value={notes} onChangeText={setNotes} multiline editable={canManage} />
      {canManage ? <Button label="Enregistrer" onPress={() => void save()} loading={busy} disabled={status === l.status && notes === (l.notes ?? '')} /> : null}

      <SectionTitle title="Répondre" />
      {applicable.length > 0 ? (
        <Chips options={applicable.map((t) => ({ id: t.id, label: t.name }))} value={templateId} onChange={pickTemplate} />
      ) : null}
      <Field label="Objet (e-mail)" value={subject} onChangeText={setSubject} />
      <Field label="Message" value={body} onChangeText={setBody} multiline />
      <Button label="Répondre par e-mail" onPress={() => void replyByEmail()} />
      <Button label="Répondre sur WhatsApp" variant="ghost" onPress={() => void replyByWhatsapp()} />
      <Text style={[styles.hint, { color: theme.muted }]}>
        Ces boutons ouvrent votre messagerie ou WhatsApp avec le texte prérempli : rien n’est envoyé automatiquement.
        {l.last_reply_at ? ` Dernière réponse ouverte : ${formatDateTime(l.last_reply_at)}.` : ''}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  message: { borderWidth: 1, borderRadius: 12, padding: spacing.md },
  hint: { fontSize: 12, lineHeight: 18 },
});
