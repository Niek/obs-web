import neostandard, { resolveIgnoresFromGitignore } from 'neostandard'
import html from 'eslint-plugin-html'
import svelte from 'eslint-plugin-svelte'
import svelteConfig from './svelte.config.js'

const htmlFiles = ['**/*.html']
const svelteFiles = ['**/*.svelte', '**/*.svelte.*']

export default [
  ...neostandard({
    env: ['browser', 'serviceworker'],
    filesTs: ['**/*.svelte.ts'],
    ignores: resolveIgnoresFromGitignore(),
    ts: true
  }),
  {
    files: htmlFiles,
    plugins: {
      html
    }
  },
  ...svelte.configs['flat/base'],
  {
    files: svelteFiles,
    languageOptions: {
      parserOptions: {
        svelteConfig
      }
    }
  }
]
