import neostandard, { resolveIgnoresFromGitignore } from 'neostandard'
import html from 'eslint-plugin-html'
import svelte from 'eslint-plugin-svelte'

const htmlFiles = ['**/*.html']
const ignores = resolveIgnoresFromGitignore()

export default [
  { ignores },
  ...neostandard({
    env: ['browser', 'serviceworker'],
    filesTs: ['**/*.svelte.ts'],
    ignores,
    ts: true
  }),
  {
    files: htmlFiles,
    plugins: {
      html
    }
  },
  ...svelte.configs['flat/base']
]
