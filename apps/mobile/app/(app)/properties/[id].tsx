import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  BOOKING_CHANNEL_LABELS,
  PERMISSIONS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_TONES,
  PROPERTY_TYPE_LABELS,
  hasPermission,
  isPortalUser,
  personFullName,
} from '@darnalux/core';
import { getProperty, getPropertyAccess, listListings } from '@darnalux/data/properties';
import { Screen } from '../../../src/components/Screen';
import { Badge, Banner, Button, Facts, Loading, SectionTitle } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { Guard } from '../../../src/features/auth/Guard';
import { useAsync } from '../../../src/lib/useAsync';
import { spacing, useTheme } from '../../../src/theme';

export default function PropertyDetailScreen() {
  return (
    <Guard anyOf={[PERMISSIONS.PROPERTIES_VIEW, PERMISSIONS.OWNER_PORTAL]}>
      <PropertyDetail />
    </Guard>
  );
}

function PropertyDetail() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const portal = isPortalUser(user);
  const canSeeAccess = hasPermission(user, PERMISSIONS.PROPERTIES_ACCESS_VIEW);
  const property = useAsync(() => getProperty(id), [id]);
  const listings = useAsync(() => listListings(id).catch(() => []), [id]);
  const access = useAsync(() => (canSeeAccess ? getPropertyAccess(id).catch(() => null) : Promise.resolve(null)), [id, canSeeAccess]);

  if (property.loading && !property.data) return <Loading />;
  if (property.error || !property.data) {
    return (
      <Screen insetBottom>
        <Banner message={property.error ?? 'Bien introuvable.'} />
      </Screen>
    );
  }
  const p = property.data;
  const a = access.data;

  return (
    <Screen insetBottom contentStyle={styles.content} onRefresh={property.reload} refreshing={property.loading}>
      <Stack.Screen options={{ title: p.name }} />
      <View style={styles.badges}>
        <Badge tone={PROPERTY_STATUS_TONES[p.status]} label={PROPERTY_STATUS_LABELS[p.status]} />
        <Badge label={PROPERTY_TYPE_LABELS[p.type]} />
      </View>

      <Facts
        items={[
          { label: 'Adresse', value: [p.address, p.city].filter(Boolean).join(', ') || '—' },
          { label: 'Capacité', value: `${p.capacity} voyageur(s)` },
          { label: 'Chambres / lits / sdb', value: `${p.bedrooms} / ${p.beds} / ${p.bathrooms}` },
          ...(portal ? [] : [{ label: 'Commission', value: `${Number(p.commission_rate)} %` }]),
        ]}
      />
      {p.description ? <Text style={{ color: theme.muted, lineHeight: 21 }}>{p.description}</Text> : null}

      {p.amenities.length > 0 ? (
        <>
          <SectionTitle title="Équipements" />
          <View style={styles.badges}>
            {p.amenities.map((amenity) => (
              <Badge key={amenity} label={amenity} />
            ))}
          </View>
        </>
      ) : null}

      {p.property_owners.length > 0 ? (
        <>
          <SectionTitle title="Propriétaires" />
          {p.property_owners.map((link) =>
            link.owners ? (
              <Button
                key={link.owner_id}
                variant="ghost"
                label={`${personFullName(link.owners.first_name, link.owners.last_name)} · ${Number(link.share_percent)} %${link.is_primary ? ' · principal' : ''}`}
                onPress={() => router.push(`/owners/${link.owner_id}`)}
              />
            ) : null,
          )}
        </>
      ) : null}

      {(listings.data ?? []).length > 0 ? (
        <>
          <SectionTitle title="Annonces" />
          <Facts
            items={(listings.data ?? []).map((l) => ({ label: BOOKING_CHANNEL_LABELS[l.platform], value: l.is_active ? 'Active' : 'Inactive' }))}
          />
        </>
      ) : null}

      {canSeeAccess && a ? (
        <>
          <SectionTitle title="Accès et procédures" />
          <Facts
            items={[
              { label: 'Code porte', value: a.door_code ?? '—' },
              { label: 'Clés', value: a.key_location ?? '—' },
              { label: 'Wi-Fi', value: a.wifi_name ?? '—' },
              { label: 'Mot de passe Wi-Fi', value: a.wifi_password ?? '—' },
            ]}
          />
          {a.access_instructions ? <Text style={{ color: theme.muted, lineHeight: 21 }}>{a.access_instructions}</Text> : null}
          {a.arrival_procedure ? <Text style={{ color: theme.muted, lineHeight: 21 }}>Arrivée : {a.arrival_procedure}</Text> : null}
          {a.departure_procedure ? <Text style={{ color: theme.muted, lineHeight: 21 }}>Départ : {a.departure_procedure}</Text> : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
