// Google Sign-In's Expo plugin configures BOTH platforms and requires a real
// GoogleService-Info.plist for the iOS half (IOSConfig.Google.withGoogle /
// withGoogleServicesFile) — we don't have an iOS Firebase app registered yet.
// This wraps the plugin's own Android-only steps (same calls the real
// plugin makes — see @react-native-google-signin/google-signin/plugin) so
// Android keeps working exactly as before, without touching iOS at all.
// Delete this file and switch app.config.js back to the plain
// "@react-native-google-signin/google-signin" plugin entry once a real
// GoogleService-Info.plist exists.
const { AndroidConfig, withPlugins } = require('@expo/config-plugins');

module.exports = function withGoogleSigninAndroidOnly(config) {
    return withPlugins(config, [
        AndroidConfig.GoogleServices.withClassPath,
        AndroidConfig.GoogleServices.withApplyPlugin,
        AndroidConfig.GoogleServices.withGoogleServicesFile,
    ]);
};
