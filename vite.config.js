import { defineConfig } from 'vite';

// One page (index.html) with hash routes: #home, #controls, #login, #play.
export default defineConfig({
  build: {
    // the sprite PNGs are tiny; keep them as separate files in public/ rather than inlining
    assetsInlineLimit: 0,
  },
});
