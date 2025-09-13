export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'GSIS AI Portal',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Enterprise AI Portal for GSIS' },
        { name: 'theme-color', content: '#1f2937' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },
  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || process.env.NUXT_PUBLIC_AGENT_MANAGEMENT_API_URL,
      region: process.env.NUXT_PUBLIC_REGION || 'us-east-1',
      awsRegion: process.env.NUXT_PUBLIC_AWS_REGION || 'us-east-1',
      userPoolId: process.env.NUXT_PUBLIC_USER_POOL_ID,
      userPoolClientId: process.env.NUXT_PUBLIC_USER_POOL_CLIENT_ID,
      identityPoolId: process.env.NUXT_PUBLIC_IDENTITY_POOL_ID,
      cognitoDomain: process.env.NUXT_PUBLIC_COGNITO_DOMAIN,
      agentManagementApiUrl: process.env.NUXT_PUBLIC_AGENT_MANAGEMENT_API_URL,
      knowledgeBaseApiUrl: process.env.NUXT_PUBLIC_KNOWLEDGE_BASE_API_URL,
      rbacApiUrl: process.env.NUXT_PUBLIC_RBAC_API_URL,
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'GSIS AI Portal'
    }
  }
})