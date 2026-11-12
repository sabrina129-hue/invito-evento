import { defineConfig, loadEnv } from 'vite'
import snapshotHandler from './api/snapshot.js'
import react from '@vitejs/plugin-react'
import { event } from './src/data/event.js'

function localServerlessApiPlugin() {
  return {
    name: 'local-serverless-snapshot-api',
    config(_config, { mode }) {
      Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
    },
    configureServer(server) {
      server.middlewares.use('/api/snapshot', async (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }

        try {
          const chunks = []
          let bodySize = 0
          for await (const chunk of req) {
            bodySize += chunk.length
            if (bodySize > 3.2 * 1024 * 1024) {
              res.statusCode = 413
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Foto troppo grande', code: 'PAYLOAD_TOO_LARGE' }))
              return
            }
            chunks.push(chunk)
          }

          req.body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
          const responseAdapter = {
            setHeader: (name, value) => res.setHeader(name, value),
            status(code) {
              res.statusCode = code
              return this
            },
            json(payload) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(payload))
              return this
            },
          }
          await snapshotHandler(req, responseAdapter)
        } catch (error) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Richiesta foto non valida', code: 'INVALID_REQUEST' }))
        }
      })
    },
  }
}
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
  plugins: [react(), htmlMetaPlugin(), localServerlessApiPlugin()],
  css: {
    postcss: './postcss.config.js'
  }
})
