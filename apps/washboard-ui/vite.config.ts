import react from '@vitejs/plugin-react';
import sourceMaps from 'rollup-plugin-sourcemaps';
import {defineConfig} from 'vite';
import svgrPlugin from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), tsconfigPaths(), svgrPlugin()],
  build: {
    sourcemap: true,
    rollupOptions: {
      plugins: [sourceMaps()],
    },
  },
  server: {
    sourcemapIgnoreList: false,
  },
});
