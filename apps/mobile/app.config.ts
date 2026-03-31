import type { ExpoConfig } from 'expo/config'

const BG = '#0a0a0a'

export default (): ExpoConfig => ({
  name: 'Circe et Venus',
  slug: 'creatix-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'creatix',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: BG,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.circeetvenus.creatix',
    buildNumber: '1',
    infoPlist: {
      NSCameraUsageDescription:
        'Circe et Venus uses the camera to capture photos for creator content and Divine workflows.',
      NSPhotoLibraryUsageDescription:
        'Circe et Venus accesses your photo library so you can attach images to creator content.',
    },
  },
  android: {
    package: 'com.circeetvenus.creatix',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: BG,
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_MEDIA_IMAGES',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-image-picker',
      {
        photosPermission:
          'Circe et Venus accesses your photos so you can attach images to creator workflows.',
        cameraPermission:
          'Circe et Venus uses the camera to capture photos for creator workflows.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
})
