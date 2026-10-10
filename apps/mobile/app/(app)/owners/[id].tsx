import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { OWNER_STATUS_LABELS, OWNER_STATUS_TONES, PERMISSIONS, personFullName } from '@darnalux/core';
import { getOwner } from '@darnalux/data/owners';
import { Screen } from '../../../src/components/Screen';
import { Badge, Banner, Button, Facts, Loading, SectionTitle } from '../../../src/components/ui';
import { Guard } from '../../../src/features/auth/Guard';
import { callPhone, openMail, openWhatsapp } from '../../../src/lib/links';
import { useAsync } from '../../../src/lib/useAsync';
import { spacing, useTheme } from '../../../src/theme';

export default function OwnerDetailScreen() {
  return (
    <Guard anyOf={[PERMISSIONS.OWNERS_VIEW]}>
      <OwnerDetail />
    </Guard>
  );
}

function OwnerDetail() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const owner = useAsync(() => getOwner(id), [id]);

  if (owner.loading && !owner.data) return <Loading />;
  if (owner.error || !owner.data) {
    return (
      <Screen insetBottom>
        <Banner message={owner.error ?? 'Propriétaire introuvable.'} />
      </Screen>
    );
  }
  const o = owner.data;
  const name = personFullName(o.first_name, o.last_name);

  return (
    <Screen insetBottom contentStyle={styles.content} onRefresh={owner.reload} refreshing={owner.loading}>
      <Stack.Screen options={{ title: name }} />
      <View style={styles.badges}>
        <Badge tone={OWNER_STATUS_TONES[o.status]} label={OWNER_STATUS_LABELS[o.status]} />
        {o.profile_id ? <Badge tone="info" label="Compte lié" /> : null}
      </View>

      <Facts
        items={[
          { label: 'E-mail', value: o.email ?? '—' },
          { label: 'Téléphone', value: o.phone ?? '—' },
          { label: 'Adresse', value: [o.address, o.city].filter(Boolean).join(', ') || '—' },
        ]}
      />

      {o.phone ? <Button label="Appeler" variant="ghost" onPress={() => void callPhone(o.phone ?? '')} /> : null}
      {o.phone ? <Button label="WhatsApp" variant="ghost" onPress={() => void openWhatsapp(o.phone, `Bonjour ${o.first_name},`)} /> : null}
      {o.email ? <Button label="Écrire un e-mail" variant="ghost" onPress={() => void openMail(o.email ?? '')} /> : null}

      <SectionTitle title="Biens" />
      {o.property_owners.length === 0 ? <Text style={{ color: theme.muted }}>Aucun bien rattaché.</Text> : null}
      {o.property_owners.map((link) =>
        link.properties ? (
          <Button
            key={link.property_id}
            variant="ghost"
            label={`${link.properties.name} · ${Number(link.share_percent)} %${link.is_primary ? ' · principal' : ''}`}
            onPress={() => router.push(`/properties/${link.property_id}`)}
          />
        ) : null,
      )}

      {o.internal_notes ? (
        <>
          <SectionTitle title="Notes internes" />
          <Text style={{ color: theme.muted, lineHeight: 21 }}>{o.internal_notes}</Text>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
