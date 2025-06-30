import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync, cpSync } from 'fs';

// Plugin to copy static assets for Chrome extension build
const copyExtensionAssets = () => {
  return {
    name: 'copy-extension-assets',
    writeBundle() {
      const buildDir = resolve(__dirname, 'build');
      if (!existsSync(buildDir)) {
        mkdirSync(buildDir, { recursive: true });
      }

      // Copy manifest.json
      copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(buildDir, 'manifest.json')
      );

      // Copy injected.js
      const injectedJsPath = resolve(__dirname, 'src/injected.js');
      if (existsSync(injectedJsPath)) {
        copyFileSync(
          injectedJsPath,
          resolve(buildDir, 'injected.js')
        );
      }

      // Copy icons folder
      const iconsDir = resolve(__dirname, 'icons');
      const buildIconsDir = resolve(buildDir, 'icons');
      if (existsSync(iconsDir)) {
        if (!existsSync(buildIconsDir)) {
          mkdirSync(buildIconsDir, { recursive: true });
        }
        cpSync(iconsDir, buildIconsDir, { recursive: true });
      }
    }
  };
};

// Plugin to copy static assets for normal React app build
const copyReactAssets = () => {
  return {
    name: 'copy-react-assets',
    writeBundle() {
      const distDir = resolve(__dirname, 'dist');
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true });
      }

      // Copy icons folder
      const iconsDir = resolve(__dirname, 'icons');
      const distIconsDir = resolve(distDir, 'icons');
      if (existsSync(iconsDir)) {
        if (!existsSync(distIconsDir)) {
          mkdirSync(distIconsDir, { recursive: true });
        }
        cpSync(iconsDir, distIconsDir, { recursive: true });
      }
    }
  };
};

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isExtensionBuild = mode === 'extension';

  // Development server configuration
  if (isDev) {
    return {
      plugins: [react()],
      server: {
        port: 3000,
        open: true,
        proxy: {
          '/api/rpc': {
            target: 'https://gorchain.wstf.io',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/rpc/, ''),
            secure: true
          }
        }
      },
      define: {
        'process.env': {}
      },
      css: {
        postcss: './postcss.config.js'
      },
      optimizeDeps: {
        include: ['buffer']
      },
      resolve: {
        alias: {
          buffer: 'buffer'
        }
      }
    };
  }

  // Chrome Extension Build Configuration
  if (isExtensionBuild) {
    return {
      plugins: [react(), copyExtensionAssets()],
      build: {
        rollupOptions: {
          input: {
            popup: resolve(__dirname, 'popup.html'),
            background: resolve(__dirname, 'src/background.js'),
            content: resolve(__dirname, 'src/content.js')
          },
          output: {
            entryFileNames: (chunkInfo) => {
              if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
                return `${chunkInfo.name}.js`;
              }
              return 'assets/[name]-[hash].js';
            },
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]'
          }
        },
        outDir: 'build'
      },
      define: {
        'process.env': {}
      },
      css: {
        postcss: './postcss.config.js'
      },
      optimizeDeps: {
        include: ['buffer']
      },
      resolve: {
        alias: {
          buffer: 'buffer'
        }
      }
    };
  }

  // Normal React App Build Configuration
  return {
    plugins: [react(), copyReactAssets()],
    build: {
      outDir: 'dist'
    },
    define: {
      'process.env': {}
    },
    css: {
      postcss: './postcss.config.js'
    },
    optimizeDeps: {
      include: ['buffer']
    },
    resolve: {
      alias: {
        buffer: 'buffer'
      }
    }
  };
});
