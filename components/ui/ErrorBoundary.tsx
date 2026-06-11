// T3.04 — Top-level error boundary.
//
// Catches render/lifecycle crashes anywhere below it, reports them to Sentry
// (no-op when Sentry is disabled), and shows a themed fallback with a retry
// that remounts the subtree. Wrap the app root so a single bad screen never
// leaves the user on a white/blank screen.
import { Component, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { captureException } from '@/lib/sentry';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    captureException(error, { componentStack: info.componentStack ?? undefined });
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: Spacing.xxl,
          gap: Spacing.lg,
        }}
      >
        <Text
          style={{
            fontFamily: Fonts.display,
            fontSize: 32,
            color: Colors.ink,
            textAlign: 'center',
          }}
        >
          Something went wrong
        </Text>
        <Text
          style={{
            fontFamily: Fonts.sans,
            fontSize: 15,
            lineHeight: 22,
            color: Colors.ink2,
            textAlign: 'center',
          }}
        >
          The app hit an unexpected error. Try again — if it keeps happening, restart the app.
        </Text>
        <Button
          label="Try again"
          variant="accent"
          onPress={this.reset}
          style={{ marginTop: Spacing.sm }}
        />
      </View>
    );
  }
}
