import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { webfontDownload } from 'vite-plugin-webfont-dl';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), webfontDownload(undefined, { embedFonts: true, injectAsStyleTag: false })],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/'),
    },
  },
  server: {
    allowedHosts: true,
  },
  base: './',
  assetsInclude: ['**/*.txt'],
});
