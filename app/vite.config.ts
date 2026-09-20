import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
const isGithubActions = process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  // The same Pages artifact is served from both the repository path and the
  // configured custom domain. Relative URLs work from either location.
  base: isGithubActions ? './' : '/',
  plugins: [react(), tailwindcss()],
})
