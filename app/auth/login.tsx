import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { APP_NAME, TAGLINE } from '@/lib/brand';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    if (!email || !password) return;
    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch {
      // Error is set in authStore
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: insets.top }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top spacer + eyebrow */}
        <View style={{ paddingTop: 60, paddingBottom: 40 }}>
          <Eyebrow color={Colors.accent} style={{ textAlign: 'center', letterSpacing: 3 }}>
            WELCOME BACK
          </Eyebrow>
          <Text style={{
            fontFamily: Fonts.display, fontSize: 42, color: Colors.ink,
            textAlign: 'center', letterSpacing: -0.5, marginTop: 8,
          }}>
            Sign in
          </Text>
          <Text style={{
            fontFamily: Fonts.displayItalic, fontSize: 16, color: Colors.ink3,
            textAlign: 'center', marginTop: 6,
          }}>
            Pick up where you left off.
          </Text>
        </View>

        {/* Error */}
        {error && (
          <View style={{
            padding: 12, borderRadius: Radius.md, marginBottom: 16,
            backgroundColor: 'rgba(255,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(255,68,68,0.25)',
          }}>
            <Text style={{ fontFamily: Fonts.sans, fontSize: 13, color: '#ff6b6b', textAlign: 'center' }}>
              {error}
            </Text>
          </View>
        )}

        {/* Fields */}
        <View style={{ gap: 12 }}>
          <View>
            <Eyebrow style={{ marginBottom: 6, marginLeft: 2 }}>EMAIL</Eyebrow>
            <TextInput
              style={{
                backgroundColor: Colors.surface,
                color: Colors.ink,
                borderRadius: Radius.md,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontFamily: Fonts.sans,
                fontSize: 15,
                borderWidth: 1,
                borderColor: Colors.hairline,
              }}
              placeholder="you@example.com"
              placeholderTextColor={Colors.ink4}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={(t) => { setEmail(t); clearError(); }}
              editable={!isLoading}
            />
          </View>

          <View>
            <Eyebrow style={{ marginBottom: 6, marginLeft: 2 }}>PASSWORD</Eyebrow>
            <TextInput
              style={{
                backgroundColor: Colors.surface,
                color: Colors.ink,
                borderRadius: Radius.md,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontFamily: Fonts.sans,
                fontSize: 15,
                borderWidth: 1,
                borderColor: Colors.hairline,
              }}
              placeholder="••••••••"
              placeholderTextColor={Colors.ink4}
              secureTextEntry
              autoComplete="password"
              value={password}
              onChangeText={(t) => { setPassword(t); clearError(); }}
              editable={!isLoading}
              onSubmitEditing={handleSignIn}
            />
          </View>
        </View>

        {/* Forgot password */}
        <Pressable style={{ alignSelf: 'flex-end', marginTop: 10 }}>
          <Text style={{ fontFamily: Fonts.sans500, fontSize: 12, color: Colors.accent }}>
            Forgot password?
          </Text>
        </Pressable>

        {/* CTA */}
        <View style={{ marginTop: 28 }}>
          {isLoading ? (
            <View style={{
              height: 52, borderRadius: Radius.pill, backgroundColor: Colors.accent,
              alignItems: 'center', justifyContent: 'center', opacity: 0.7,
            }}>
              <ActivityIndicator color={Colors.black} />
            </View>
          ) : (
            <Button label="Sign In" variant="accent" block height={52} onPress={handleSignIn} />
          )}
        </View>

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 28, gap: 14 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: Colors.hairline }} />
          <Text style={{ fontFamily: Fonts.sans, fontSize: 11, color: Colors.ink4 }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: Colors.hairline }} />
        </View>

        {/* Register link */}
        <Pressable
          onPress={() => router.push('/auth/register')}
          style={{ marginTop: 24, alignItems: 'center' }}
        >
          <Text style={{ fontFamily: Fonts.sans, fontSize: 13, color: Colors.ink3 }}>
            No account yet?{' '}
            <Text style={{ fontFamily: Fonts.sans600, color: Colors.accent }}>Create one</Text>
          </Text>
        </Pressable>

        {/* Bottom branding */}
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: insets.bottom + 20, paddingTop: 40 }}>
          <Text style={{ fontFamily: Fonts.displayItalic, fontSize: 13, color: Colors.ink4, textAlign: 'center' }}>
            {APP_NAME} — {TAGLINE}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
