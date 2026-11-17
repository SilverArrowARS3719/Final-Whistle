import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { fileURLToPath } from 'node:url'

// Anything named VITE_* is copied into the JavaScript every visitor downloads. The Supabase publishable (anon)
// key is meant to be public; a secret / service_role key would give anyone full control of the database.
// So the dev server and the build both refuse to start with one.
const jwtRole = (v: string) => { try { return JSON.parse(Buffer.from(v.split('.')[1] ?? '', 'base64url').toString()).role ?? '' } catch { return '' } }
function noSecrets(env: Record<string, string>) {
  for (const [name, value] of Object.entries(env)) {
    if (/SECRET|SERVICE_ROLE|PRIVATE|PASSWORD/i.test(name) || value.startsWith('sb_secret_') || jwtRole(value) === 'service_role')
      throw new Error(`${name} looks like a secret key. Only the publishable (anon) key belongs in the app. Remove it from .env.local.`)
  }
}

// Content Security Policy: the page may only run its own scripts and talk to its own Supabase project, so even
// if someone slipped HTML into a username, the browser would refuse to run it or send data anywhere else.
// Build only: the dev server injects inline scripts for hot reload.
function csp(supabaseUrl?: string): Plugin {
  const api = supabaseUrl ? new URL(supabaseUrl) : null
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // motion sets inline styles
    "img-src 'self' data: blob:", // data: = the two-step QR code
    "font-src 'self'",
    `connect-src 'self'${api ? ` ${api.origin} wss://${api.host}` : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
      { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head-prepend' },
    ],
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  noSecrets(env)
  return {
    plugins: [react(), csp(env.VITE_SUPABASE_URL)],
    resolve: {
      // only the icons in src/frontend/icons.ts get bundled (the package's own entry ships all of them)
      alias: [{ find: /^@phosphor-icons\/react$/, replacement: fileURLToPath(new URL('./src/frontend/icons.ts', import.meta.url)) }],
    },
    build: {
      rolldownOptions: {
        output: {
          // libraries in their own files: they rarely change, so returning players keep them cached across updates
          manualChunks(id: string) {
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
            if (/node_modules\/(motion|motion-dom|motion-utils|framer-motion)\//.test(id)) return 'motion'
            if (/node_modules\/@supabase\//.test(id)) return 'supabase'
          },
        },
      },
    },
  }
})
