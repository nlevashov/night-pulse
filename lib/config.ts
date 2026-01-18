/**
 * Application configuration
 *
 * IMPORTANT: For production, replace the Google Client ID with your own.
 * See README.md for setup instructions.
 */

// Google OAuth Client ID for Gmail integration
// To get your own: https://console.cloud.google.com/apis/credentials
export const GOOGLE_CLIENT_ID = '587826292807-u0p69ioudogh954vfdfq4ajoge8g77tv.apps.googleusercontent.com';

// Reversed client ID for iOS URL scheme (used as redirect URI)
export const GOOGLE_REVERSED_CLIENT_ID = GOOGLE_CLIENT_ID.split('.').reverse().join('.');
// Result: com.googleusercontent.apps.587826292807-u0p69ioudogh954vfdfq4ajoge8g77tv
