// Web-only presentation shell. Imported FIRST from the custom entry (index.js)
// so it runs before any screen module evaluates its layout constants.
//
// The product is a phone-form-factor app. On desktop browsers we render it as
// a centered phone-width column (the ReelShort/DramaBox web pattern) instead of
// stretching editorial layouts across 1920px:
// 1. Clamp Dimensions window width to PHONE_W — screens compute card math from
//    Dimensions.get('window') at module scope, so the clamp must precede them.
// 2. Constrain + center the #root element with injected CSS.
import { Dimensions, Platform } from 'react-native';

export const PHONE_W = 430;

if (Platform.OS === 'web') {
  const originalGet = Dimensions.get.bind(Dimensions);
  Dimensions.get = ((dim: 'window' | 'screen') => {
    const d = originalGet(dim);
    return d.width > PHONE_W ? { ...d, width: PHONE_W } : d;
  }) as typeof Dimensions.get;

  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      html, body { height: 100%; margin: 0; background: #050407; }
      body {
        background:
          radial-gradient(1200px 600px at 50% -10%, rgba(232,197,112,0.07), transparent 60%),
          #050407;
      }
      #root {
        height: 100dvh;
        margin: 0 auto;
        max-width: ${PHONE_W}px;
        overflow: hidden;
      }
      @media (min-width: ${PHONE_W + 1}px) {
        #root {
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.08),
            0 24px 80px rgba(0,0,0,0.8);
          border-radius: 0;
        }
      }
      /* Hide scrollbars inside the phone column — native-feeling scroll. */
      #root ::-webkit-scrollbar { width: 0; height: 0; }
    `;
    document.head.appendChild(style);
  }
}
