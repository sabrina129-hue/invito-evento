import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { event } from './src/data/event.js'

function htmlMetaPlugin() {
  const replacements = {
    __PAGE_TITLE__: event.meta.pageTitle,
    __OG_TITLE__: event.meta.shareTitle,
    __OG_DESCRIPTION__: event.meta.shareDescription,
    __OG_IMAGE__: event.meta.shareImage,
    __OG_URL__: event.meta.siteUrl,
    __THEME_COLOR__: event.meta.themeColor,
    __FAVICON__: event.meta.favicon,
    __FONT_STYLESHEET__: event.meta.fontStylesheet,
  }

  return {
    name: 'event-html-meta',
    transformIndexHtml(html) {
      return Object.entries(replacements).reduce(
        (result, [token, value]) => result.replaceAll(token, value),
        html
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), htmlMetaPlugin()],
  css: {
    postcss: './postcss.config.js'
  }
})
