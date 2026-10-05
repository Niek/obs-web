import adapter from '@sveltejs/adapter-static'
import { sveltekit } from '@sveltejs/kit/vite'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import purgecssImport from '@fullhuman/postcss-purgecss'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const production = mode === 'production'
  const purgecss = purgecssImport.default ?? purgecssImport

  return {
    appType: 'custom',
    plugins: [sveltekit({
      preprocess: vitePreprocess(),
      adapter: adapter({
        pages: 'public',
        assets: 'public',
        fallback: 'index.html'
      }),
      output: {
        bundleStrategy: 'single'
      }
    })],
    css: {
      postcss: {
        plugins: [
          production &&
            purgecss({
              content: [
                './src/**/*.svelte',
                './src/**/*.js',
                './src/**/*.ts',
                './src/**/*.html',
                './src/app.html'
              ],
              safelist: {
                standard: [/svelte-/]
              },
              variables: true
            })
        ].filter(Boolean)
      }
    },
    build: {
      minify: 'terser',
      cssMinify: 'lightningcss',
      terserOptions: {
        compress: {
          passes: 2
        }
      }
    }
  }
})
