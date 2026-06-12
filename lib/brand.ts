// Brand identity derived from the build-time brand manifest (app.config.js
// `name` comes from brands/<variant>/manifest.json). Screens must use these
// instead of hardcoding "CineDramas" — that's the whole white-label pitch.
import Constants from 'expo-constants';

export const APP_NAME: string = Constants.expoConfig?.name ?? 'CineDramas';

export const TAGLINE: string =
  Constants.expoConfig?.extra?.tagline ?? 'the way short stories should be';

/**
 * Split the app name for the two-line wordmark on onboarding.
 * "CineDramas" -> ["Cine", "Dramas"]; "Studio Reel" -> ["Studio", "Reel"];
 * single-word names render on one line.
 */
export function wordmarkLines(name: string = APP_NAME): string[] {
  if (name.includes(' ')) {
    const i = name.indexOf(' ');
    return [name.slice(0, i), name.slice(i + 1)];
  }
  const camel = name.match(/^([A-Z][a-z]+)([A-Z].*)$/);
  if (camel) return [camel[1], camel[2]];
  return [name];
}
