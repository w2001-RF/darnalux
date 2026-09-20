import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// envDir points to the monorepo root so a single .env file (see root
// .env.example) configures the Web app without duplicating it per-package.
export default defineConfig({plugins:[react()],base:'./',envDir:'../../',build:{outDir:'dist'}});
