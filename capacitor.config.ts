import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.aosibin.spaced',
  appName: 'Aosibin',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    NotificationScheduler: {},
  },
}

export default config
