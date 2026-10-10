import { Alert, Linking } from 'react-native';
import { buildMailtoUrl, buildWhatsappUrl } from '@darnalux/core';

async function open(url: string, failure: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Impossible d’ouvrir', failure);
  }
}

export function callPhone(phone: string): Promise<void> {
  return open(`tel:${phone.replace(/\s+/g, '')}`, 'Aucune application d’appel disponible.');
}

export function openMail(email: string, subject = '', body = ''): Promise<void> {
  return open(buildMailtoUrl(email, subject, body), 'Aucune application e-mail configurée sur cet appareil.');
}

/** Returns false when the number cannot be used for WhatsApp. */
export function openWhatsapp(phone: string | null | undefined, text = ''): Promise<boolean> {
  const url = buildWhatsappUrl(phone, text);
  if (!url) return Promise.resolve(false);
  return open(url, 'WhatsApp n’est pas installé sur cet appareil.').then(() => true);
}
