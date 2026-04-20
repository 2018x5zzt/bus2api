export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@nuxt/eslint',
  ],

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': {
      prerender: true,
      headers: {
        'cache-control': 'no-store',
      },
    },
    '/models': {
      swr: 600,
      headers: {
        'cache-control': 'no-store',
      },
    },
    '/pricing': {
      swr: 600,
      headers: {
        'cache-control': 'no-store',
      },
    },
    '/announcements': {
      swr: 300,
      headers: {
        'cache-control': 'no-store',
      },
    },
    '/announcements/**': {
      swr: 300,
      headers: {
        'cache-control': 'no-store',
      },
    },
    '/docs/**': {
      prerender: true,
      headers: {
        'cache-control': 'no-store',
      },
    },
    '/auth/**': {
      ssr: true,
      headers: {
        'cache-control': 'no-store',
      },
    },
    '/console/**': {
      ssr: false,
      headers: {
        'cache-control': 'no-store',
      },
    },
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
