import { defineConfig } from 'vite'
import { readFile, writeFile } from 'node:fs/promises'

function injectServiceWorkerAssets() {
  let appAssets: string[] = []
  return {
    name: 'inject-service-worker-assets',
    generateBundle(_options: unknown, bundle: Record<string, { fileName: string }>) {
      appAssets = Object.values(bundle)
        .map(({ fileName }) => fileName)
        .filter((fileName) => /\.(?:js|css)$/.test(fileName))
        .map((fileName) => `/${fileName}`)
    },
    async closeBundle() {
      const path = new URL('./dist/sw.js', import.meta.url)
      const source = await readFile(path, 'utf8')
      await writeFile(path, source.replace('[] /* __APP_ASSETS__ */', JSON.stringify(appAssets)))
    },
  }
}

export default defineConfig({
  plugins: [injectServiceWorkerAssets()],
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app-[hash].js',
        assetFileNames: (asset) => asset.name?.endsWith('.css') ? 'assets/app-[hash].css' : 'assets/[name]-[hash][extname]',
      },
    },
  },
})
