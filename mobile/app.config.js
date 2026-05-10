export default {
  "expo": {
    "name": "Ayuxa Care",
    "slug": "ayuxacare",
    "owner": "ayuxacare",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icons/ios/iTunesArtwork@3x.png",
    "scheme": "ayuxacare",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "package": "com.ayuxacare.app",
      "googleServicesFile": "./google-services.json",
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/icons/android/mipmap-xxxhdpi/logo_foreground.png",
        "backgroundImage": "./assets/icons/android/mipmap-xxxhdpi/logo.png"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "config": {
        "googleMaps": {
          "apiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      }
    },
    "web": {
      "output": "static",
      "favicon": "./assets/icons/ios/iTunesArtwork@3x.png"
    },
    "extra": {
      "eas": {
        "projectId": "f20d4f08-d7cc-4385-a8ac-9cfe1ab0caad"
      }
    },
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./assets/icons/android/mipmap-xxxhdpi/logo_foreground.png",
          "color": "#048357",
          "defaultChannel": "ayuxacare-default",
          "sounds": []
        }
      ],
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/transparent.png",
          "resizeMode": "contain",
          "backgroundColor": "#FFFFFF"
        }
      ],
      "@react-native-community/datetimepicker",
      "@react-native-google-signin/google-signin",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow ayuxacare to access your location for emergency SOS alerts and address auto-fill.",
          "locationWhenInUsePermission": "Allow ayuxacare to access your location for emergency SOS alerts and address auto-fill."
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    }
  }
};
