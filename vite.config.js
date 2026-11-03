import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  // Feature switches, baked in at build time (src/config/features.js). Registration
  // (login + dashboard) stays out of the build unless VITE_REGISTRATION_OPEN=true.
  define: {
    __REGISTRATION_OPEN__: JSON.stringify(loadEnv(mode, process.cwd(), 'VITE_').VITE_REGISTRATION_OPEN === 'true'),
  },
  plugins: [react(), tailwindcss()],
  build: {
    sourcemap: false, // never publish the source
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          gsap: ['gsap'],
        },
      },
    },
  },
}));
