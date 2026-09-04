import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.zhangdapeng.spaced',
  appName: 'Spaced',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    NotificationScheduler: {},
    FirebaseAuthentication: {
      providers: ['google.com'],
    },
  },
}

export default config
