import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia']
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('echarts')) {
            return 'echarts'
          }

          if (id.includes('@element-plus/icons-vue')) {
            return 'element-plus-icons'
          }

          if (id.includes('@floating-ui')) {
            return 'element-plus-floating'
          }

          if (id.includes('@popperjs/core')) {
            return 'element-plus-popper'
          }

          if (id.includes('async-validator')) {
            return 'element-plus-validator'
          }

          if (id.includes('dayjs')) {
            return 'element-plus-dayjs'
          }

          if (id.includes('element-plus/es/components/table') || id.includes('element-plus/es/components/pagination')) {
            return 'ep-data-entry'
          }

          if (id.includes('element-plus/es/components/menu') || id.includes('element-plus/es/components/tabs')) {
            return 'ep-navigation'
          }

          if (id.includes('element-plus') || id.includes('@element-plus')) {
            return 'element-plus'
          }

          if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
            return 'vue-vendor'
          }

          return 'vendor'
        }
      }
    }
  }
})

