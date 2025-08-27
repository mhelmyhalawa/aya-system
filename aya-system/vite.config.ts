import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { Plugin } from 'vite';

// Labels for index.html
const indexHtmlLabels = {
  title: "مكتب آية - نظام إدارة مسابقة تحفيظ القرآن الكريم",
  description: "نظام شامل ومتطور لإدارة مسابقة تحفيظ القرآن الكريم مع إمكانية تسجيل الدرجات ومتابعة التقدم واستعلام أولياء الأمور",
  author: "مكتب آية",
  keywords: "القرآن الكريم, تحفيظ, مسابقة, تجويد, تلاوة, حفظ, إدارة, نظام"
};

// HTML Labels Plugin
function replaceHtmlLabels(): Plugin {
  return {
    name: 'replace-html-labels',
    transformIndexHtml(html) {
      html = html.replace(/<title>.*?<\/title>/, `<title>${indexHtmlLabels.title}</title>`);
      html = html.replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${indexHtmlLabels.description}"`);
      html = html.replace(/<meta name="author" content=".*?"/, `<meta name="author" content="${indexHtmlLabels.author}"`);
      html = html.replace(/<meta name="keywords" content=".*?"/, `<meta name="keywords" content="${indexHtmlLabels.keywords}"`);
      html = html.replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${indexHtmlLabels.title}"`);
      html = html.replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${indexHtmlLabels.description}"`);
      return html;
    }
  };
}

export default defineConfig(({ mode }) => {
  // Load .env files based on mode
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: env.VITE_PUBLIC_URL || '/', // استخدم قيمة VITE_PUBLIC_URL من env
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      replaceHtmlLabels(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        fs: path.resolve(__dirname, "./src/lib/shims/fs-shim.js"),
        path: path.resolve(__dirname, "./src/lib/shims/path-shim.js"),
        dotenv: path.resolve(__dirname, "./src/lib/shims/dotenv-shim.js"),
        process: path.resolve(__dirname, "./src/lib/shims/process-shim.js"),
      },
    },
    optimizeDeps: {
      exclude: ["fs", "path", "dotenv"],
    },
  };
});
