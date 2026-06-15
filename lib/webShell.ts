// Web-only presentation shell. Imported FIRST from the custom entry (index.js).
// Injects base page CSS; responsive desktop layouts live in lib/layout.tsx and
// the screens themselves (the app renders full-width like a real web app).
import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    html, body {
      height: 100%;
      margin: 0;
      background: #08070A;
      /* Premium type rendering — crisper Playfair/Geist on web. */
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      -webkit-tap-highlight-color: transparent;
      overscroll-behavior: none;
    }
    #root { height: 100dvh; }
    /* Native-feeling scroll — no visible scrollbars inside the app shell. */
    #root ::-webkit-scrollbar { width: 0; height: 0; }
    /* Brand-tinted text selection. */
    ::selection { background: rgba(232,197,112,0.30); color: #FAF6EE; }
    /* Respect reduced motion: drop hover/scale transitions. */
    @media (prefers-reduced-motion: reduce) {
      * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
    }
  `;
  document.head.appendChild(style);
}
