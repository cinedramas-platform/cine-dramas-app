// Custom entry: the web shell must evaluate before any route module so its
// Dimensions clamp precedes module-scope layout constants in screens.
import './lib/webShell';
import 'expo-router/entry';
