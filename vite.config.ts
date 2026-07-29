import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// base must match the GitHub Pages sub-path (https://<user>.github.io/fitlog/)
const base = '/fitlog/'

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      // jpg is not in the plugin default: without it the guide photos would
      // be missing offline, which is exactly where they are needed. woff2
      // keeps the bundled font available offline too.
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2,webmanifest}'] },
      manifest: {
        name: 'fitlog',
        short_name: 'fitlog',
        description: 'Workout of the day and current working weights',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0c0f',
        theme_color: '#0b0c0f',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
