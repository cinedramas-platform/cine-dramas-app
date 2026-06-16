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
      background: #0A0A0F;
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
    ::selection { background: rgba(124,92,255,0.40); color: #F4F5FA; }
    /* Respect reduced motion: drop hover/scale transitions. */
    @media (prefers-reduced-motion: reduce) {
      * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
    }
  `;
  document.head.appendChild(style);

  // Load the Mux web player as a native custom element from CDN. Loading it at
  // runtime (not via Metro/bundler) sidesteps the class-field transpilation that
  // crashes @mux/mux-player-react under Metro. <mux-player> then upgrades in
  // place wherever VideoPlayer.web renders it, giving the full web control bar.
  if (!document.querySelector('script[data-mux-player]')) {
    const s = document.createElement('script');
    s.type = 'module';
    s.dataset.muxPlayer = '1';
    s.src = 'https://cdn.jsdelivr.net/npm/@mux/mux-player@3';
    document.head.appendChild(s);
  }
  // Brand the player chrome (accent scrubber/affordances).
  const muxCss = document.createElement('style');
  muxCss.textContent = `
    mux-player {
      --media-primary-color: #F4F5FA;
      --media-accent-color: #7C5CFF;
      --media-control-background: rgba(10,10,15,0.4);
      width: 100%; height: 100%;
    }
  `;
  document.head.appendChild(muxCss);
}
