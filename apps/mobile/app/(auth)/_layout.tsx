import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/features/auth/AuthContext';

export default function AuthLayout() {
  const { status } = useAuth();
  if (status === 'signed-in') return <Redirect href="/home" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
