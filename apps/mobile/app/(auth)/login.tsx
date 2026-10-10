import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AuthError } from '@darnalux/core';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/features/auth/AuthContext';
import { spacing, useTheme } from '../../src/theme';

export default function LoginScreen() {
  const { signIn, error: contextError } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(
        e instanceof AuthError && e.code === 'INVALID_CREDENTIALS'
          ? 'Email ou mot de passe incorrect.'
          : 'Connexion impossible. Vérifiez votre réseau et réessayez.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const message = error ?? contextError;
  const inputStyle = [styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }];

  return (
    // Edge-to-edge (always on from Android 16) no longer resizes the window for the keyboard,
    // so padding is needed on Android as well as iOS.
    <KeyboardAvoidingView style={styles.fill} behavior="padding">
      <Screen centered insetTop insetBottom>
      <View style={styles.form}>
        <Text style={[styles.title, { color: theme.text }]}>DarnaLux</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>Connectez-vous à votre espace</Text>

        <TextInput
          style={inputStyle}
          placeholder="Email"
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={inputStyle}
          placeholder="Mot de passe"
          placeholderTextColor={theme.muted}
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={canSubmit ? onSubmit : undefined}
        />

        {message ? <Text style={[styles.error, { color: theme.danger }]}>{message}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={onSubmit}
          style={[styles.button, { backgroundColor: theme.primary, opacity: canSubmit ? 1 : 0.5 }]}
        >
          {submitting ? (
            <ActivityIndicator color={theme.onPrimary} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.onPrimary }]}>Se connecter</Text>
          )}
        </Pressable>
      </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  form: { gap: spacing.md },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: 16, marginBottom: spacing.md },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 16 },
  error: { fontSize: 14 },
  button: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
