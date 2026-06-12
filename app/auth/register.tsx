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
import { WebContent } from '@/lib/layout';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSignUp = async () => {
    setLocalError('');
    if (!email || !password) return;
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }
    try {
      await signUp(email.trim(), password);
      router.replace('/');
    } catch {
      // Error is set in authStore
    }
  };

  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: insets.top }}
        keyboardShouldPersistTaps="handled"
      >
        <WebContent max={460}>
          {/* Top spacer + eyebrow */}
          <View style={{ paddingTop: 50, paddingBottom: 32 }}>
            <Eyebrow color={Colors.accent} style={{ textAlign: 'center', letterSpacing: 3 }}>
              JOIN THE CLUB
            </Eyebrow>
            <Text
              style={{
                fontFamily: Fonts.display,
                fontSize: 42,
                color: Colors.ink,
                textAlign: 'center',
                letterSpacing: -0.5,
                marginTop: 8,
              }}
            >
              Create account
            </Text>
            <Text
              style={{
                fontFamily: Fonts.displayItalic,
                fontSize: 16,
                color: Colors.ink3,
                textAlign: 'center',
                marginTop: 6,
              }}
            >
              Your next obsession awaits.
            </Text>
          </View>

          {/* Error */}
          {displayError && (
            <View
              style={{
                padding: 12,
                borderRadius: Radius.md,
                marginBottom: 16,
                backgroundColor: 'rgba(255,68,68,0.08)',
                borderWidth: 1,
                borderColor: 'rgba(255,68,68,0.25)',
              }}
            >
              <Text
                style={{
                  fontFamily: Fonts.sans,
                  fontSize: 13,
                  color: '#ff6b6b',
                  textAlign: 'center',
                }}
              >
                {displayError}
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
                onChangeText={(t) => {
                  setEmail(t);
                  clearError();
                  setLocalError('');
                }}
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
                placeholder="At least 6 characters"
                placeholderTextColor={Colors.ink4}
                secureTextEntry
                autoComplete="new-password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  clearError();
                  setLocalError('');
                }}
                editable={!isLoading}
              />
            </View>

            <View>
              <Eyebrow style={{ marginBottom: 6, marginLeft: 2 }}>CONFIRM PASSWORD</Eyebrow>
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
                placeholder="Repeat password"
                placeholderTextColor={Colors.ink4}
                secureTextEntry
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  setLocalError('');
                }}
                editable={!isLoading}
                onSubmitEditing={handleSignUp}
              />
            </View>
          </View>

          {/* CTA */}
          <View style={{ marginTop: 28 }}>
            {isLoading ? (
              <View
                style={{
                  height: 52,
                  borderRadius: Radius.pill,
                  backgroundColor: Colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.7,
                }}
              >
                <ActivityIndicator color={Colors.black} />
              </View>
            ) : (
              <Button
                label="Create Account"
                variant="accent"
                block
                height={52}
                onPress={handleSignUp}
              />
            )}
          </View>

          {/* Fine print */}
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 10,
              color: Colors.ink4,
              textAlign: 'center',
              lineHeight: 15,
              marginTop: 14,
              paddingHorizontal: 12,
            }}
          >
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </Text>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 14 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: Colors.hairline }} />
            <Text style={{ fontFamily: Fonts.sans, fontSize: 11, color: Colors.ink4 }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: Colors.hairline }} />
          </View>

          {/* Login link */}
          <Pressable
            onPress={() => router.push('/auth/login')}
            style={{ marginTop: 20, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: Fonts.sans, fontSize: 13, color: Colors.ink3 }}>
              Already have an account?{' '}
              <Text style={{ fontFamily: Fonts.sans600, color: Colors.accent }}>Sign in</Text>
            </Text>
          </Pressable>

          {/* Bottom branding */}
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              paddingBottom: insets.bottom + 20,
              paddingTop: 40,
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.displayItalic,
                fontSize: 13,
                color: Colors.ink4,
                textAlign: 'center',
              }}
            >
              {APP_NAME} — {TAGLINE}
            </Text>
          </View>
        </WebContent>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
