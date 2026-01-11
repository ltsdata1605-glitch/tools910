
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Đảm bảo đường dẫn tương đối để chạy tốt trên GitHub Pages
  define: {
    // Vite shim cho process.env để code của bạn không bị lỗi 'process is not defined'
    // Đồng thời inject API_KEY từ môi trường build vào ứng dụng
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false,
    // Tối ưu hóa dung lượng file sau khi build
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', '@google/genai'],
        },
      },
    },
  }
});
