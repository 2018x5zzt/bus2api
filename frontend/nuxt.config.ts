export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@nuxt/eslint',
  ],

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true },
    '/models': { swr: 600 },
    '/pricing': { swr: 600 },
    '/announcements': { swr: 300 },
    '/announcements/**': { swr: 300 },
    '/docs/**': { prerender: true },
    '/auth/**': { ssr: true },
    '/console/**': { ssr: false },
  },

  nitro: {
    devProxy: {
      '/api/v1': {
        target: 'http://localhost:8080/api/v1',
        changeOrigin: true,
      },
    },
  },

  i18n: {
    locales: [
      { code: 'zh', name: '中文', file: 'zh.ts' },
      { code: 'en', name: 'English', file: 'en.ts' },
    ],
    defaultLocale: 'zh',
    strategy: 'prefix_except_default',
    langDir: 'locales',
  },

  runtimeConfig: {
    sub2apiBaseUrl: 'http://localhost:8080',
    public: {
      siteName: 'Bus2API',
      apiBaseUrl: '',
    },
  },

  devtools: { enabled: true },
  compatibilityDate: '2025-01-01',
})
