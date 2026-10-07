import { defineConfig } from 'vite';

// base './' : le build fonctionne aussi bien à la racine d'un domaine
// que dans un sous-dossier GitHub Pages (https://<user>.github.io/<repo>/).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
});
