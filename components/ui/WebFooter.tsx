// Site footer — desktop web only. A real streaming website has a footer; its
// presence is a big part of why a page reads as a "site" and not a blown-up
// phone screen. Quiet and editorial: wordmark + a few link columns + fine print.
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { APP_NAME, TAGLINE } from '@/lib/brand';
import { CONTENT_MAX, useWebGutter, useIsWideWeb } from '@/lib/layout';

const COLUMNS: { heading: string; links: string[] }[] = [
  { heading: 'Browse', links: ['Home', 'Discover', 'New this week', 'Categories'] },
  { heading: 'Account', links: ['My list', 'Coins & VIP', 'Settings', 'Help'] },
  { heading: 'Company', links: ['About', 'For creators', 'Press', 'Contact'] },
  { heading: 'Legal', links: ['Terms', 'Privacy', 'Cookies'] },
];

function FooterLink({ label }: { label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}>
      <Text
        style={{
          fontFamily: Fonts.sans,
          fontSize: 13,
          color: hovered ? Colors.ink : Colors.ink3,
          ...(Platform.OS === 'web'
            ? ({ transition: 'color 160ms ease' } as unknown as object)
            : null),
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function WebFooter() {
  const gutter = useWebGutter();
  const wide = useIsWideWeb();
  const year = 2026;

  return (
    <View
      style={{
        width: '100%',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: Colors.hairline,
        marginTop: 24,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: CONTENT_MAX,
          paddingHorizontal: gutter,
          paddingTop: 48,
          paddingBottom: 40,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 32,
          }}
        >
          {/* Brand block */}
          <View style={{ width: wide ? 300 : '100%', gap: 10 }}>
            <Text
              style={{
                fontFamily: Fonts.display,
                fontSize: 22,
                color: Colors.ink,
                letterSpacing: -0.5,
              }}
            >
              {APP_NAME}
            </Text>
            <Text
              style={{
                fontFamily: Fonts.displayItalic,
                fontSize: 13,
                color: Colors.ink3,
                maxWidth: 260,
                lineHeight: 19,
              }}
            >
              {TAGLINE}
            </Text>
          </View>

          {/* Link columns */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: wide ? 56 : 32, flex: 1, justifyContent: wide ? 'flex-end' : 'flex-start' }}>
            {COLUMNS.map((col) => (
              <View key={col.heading} style={{ gap: 12, minWidth: 110 }}>
                <Text
                  style={{
                    fontFamily: Fonts.sans600,
                    fontSize: 11,
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                    color: Colors.ink2,
                  }}
                >
                  {col.heading}
                </Text>
                {col.links.map((l) => (
                  <FooterLink key={l} label={l} />
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Fine print */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginTop: 40,
            paddingTop: 22,
            borderTopWidth: 1,
            borderTopColor: Colors.hairline2,
          }}
        >
          <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: Colors.ink4 }}>
            © {year} {APP_NAME}. All rights reserved.
          </Text>
          <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: Colors.ink4 }}>
            Streaming, reimagined for short drama.
          </Text>
        </View>
      </View>
    </View>
  );
}
