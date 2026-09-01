export default {
  "expo": {
    "name": "Ayuxa",
    "slug": "ayuxacare",
    "owner": "ayuxacare",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icons/icon.png",
    "scheme": "ayuxacare",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.ayuxacare.app",
      "googleServicesFile": "./GoogleService-Info.plist",
      "infoPlist": {
        "NSCameraUsageDescription": "Ayuxa needs camera access to let you take photos of prescriptions, lab reports, and your profile picture.",
        "NSPhotoLibraryUsageDescription": "Ayuxa needs photo library access to let you upload prescriptions, lab reports, and your profile picture.",
        "NSLocationWhenInUseUsageDescription": "Allow ayuxacare to access your location for emergency SOS alerts and address auto-fill.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Allow ayuxacare to access your location for emergency SOS alerts and address auto-fill."
      }
    },
    "android": {
      "package": "com.ayuxacare.app",
      "googleServicesFile": "./google-services.json",
      "softwareKeyboardLayoutMode": "resize",
      "adaptiveIcon": {
        "foregroundImage": "./assets/icons/icon.png",
        "backgroundColor": "#F5F0E8"
      },
      "edgeToEdgeEnabled": true,
      "navigationBar": {
        "backgroundColor": "#00000000"
      },
      "predictiveBackGestureEnabled": false,
      "permissions": [
        "android.permission.CALL_PHONE"
      ],
      "queries": [
        {
          "scheme": "tel"
        }
      ],
      "config": {
        "googleMaps": {
          "apiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      }
    },
    "web": {
      "output": "static",
      "favicon": "./assets/icons/icon.png"
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
          "icon": "./assets/icons/icon.png",
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
      "./plugins/withAndroidHardening.js",
      [
        "expo-secure-store",
        {
          "faceIDPermission": false
        }
      ],
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
