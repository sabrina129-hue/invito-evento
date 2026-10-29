import { Buffer } from 'node:buffer'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { event } from './src/data/event.js'

const apiRoutes = {
  '/api/admin-login': () => import('./api/admin-login.js'),
  '/api/rsvps': () => import('./api/rsvps.js'),
  '/api/rsvp': () => import('./api/rsvp.js'),
  '/api/photos': () => import('./api/photos.js'),
  '/api/env-check': () => import('./api/env-check.js'),
}

function htmlMetaPlugin() {
  const replacements = {
    __PAGE_TITLE__: event.meta.pageTitle,
    __OG_TITLE__: event.meta.shareTitle,
    __OG_DESCRIPTION__: event.meta.shareDescription,
    __OG_IMAGE__: event.meta.shareImage,
    __OG_IMAGE_WIDTH__: event.meta.shareImageWidth,
    __OG_IMAGE_HEIGHT__: event.meta.shareImageHeight,
    __OG_IMAGE_TYPE__: event.meta.shareImageType,
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

function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url || '/', 'http://localhost')
        const pathname = requestUrl.pathname
        const loadRoute = apiRoutes[pathname]

        if (!loadRoute) {
          next()
          return
        }

        req.query = Object.fromEntries(requestUrl.searchParams.entries())

        const chunks = []

        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        }

        const rawBody = Buffer.concat(chunks).toString('utf8').trim()

        if (rawBody) {
          try {
            req.body = JSON.parse(rawBody)
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Body JSON non valido' }))
            return
          }
        } else {
          req.body = {}
        }

        res.status = code => {
          res.statusCode = code
          return res
        }
        res.json = payload => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(payload))
          return res
        }
        res.send = payload => {
          res.end(payload)
          return res
        }

        try {
          const route = await loadRoute()
          await route.default(req, res)
        } catch (error) {
          server.config.logger.error(error)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Errore API locale' }))
          }
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), htmlMetaPlugin(), localApiPlugin()],
  css: {
    postcss: './postcss.config.js'
  }
})
