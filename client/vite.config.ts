import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function umamiAnalytics(): Plugin {
  return {
    name: 'umami-analytics',
    transformIndexHtml(html) {
      const scriptUrl = process.env.VITE_UMAMI_SCRIPT_URL;
      const websiteId = process.env.VITE_UMAMI_WEBSITE_ID;
      if (!scriptUrl || !websiteId) return html;
      const tag = `<script defer src="${scriptUrl}" data-website-id="${websiteId}"></script>`;
      return html.replace('<!--umami-analytics-->', tag);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), umamiAnalytics()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
})
