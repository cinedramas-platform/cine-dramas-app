// Web-only presentation shell. Imported FIRST from the custom entry (index.js).
// Injects base page CSS; responsive desktop layouts live in lib/layout.tsx and
// the screens themselves (the app renders full-width like a real web app).
import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    html, body { height: 100%; margin: 0; background: #08070A; }
    #root { height: 100dvh; }
    /* Native-feeling scroll — no visible scrollbars inside the app shell. */
    #root ::-webkit-scrollbar { width: 0; height: 0; }
  `;
  document.head.appendChild(style);
}
