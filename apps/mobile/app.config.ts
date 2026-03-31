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
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
})
