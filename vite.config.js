import { sveltekit } from '@sveltejs/kit/vite'

const allowedHosts = (process.env.VITE_ALLOWED_HOSTS || '')
  .split(',')
  .map(host => host.trim())
  .filter(Boolean)

export default {
  plugins: [sveltekit()],
  server: {
    allowedHosts: ['localhost', '127.0.0.1', ...allowedHosts]
  },
  preview: {
    allowedHosts: ['localhost', '127.0.0.1', ...allowedHosts]
  }
}
