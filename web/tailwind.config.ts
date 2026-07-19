import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Windborne 设计系统色板（HUD 风格）
        hud: {
          bg: '#0B0B10',          // OLED 深色背景
          'bg-soft': '#13131A',   // 卡片背景
          'bg-glass': 'rgba(19, 19, 26, 0.6)', // 玻璃拟态
          border: '#1F1F2E',      // 描边
          'border-glow': '#2A2A3E', // 发光描边
          blue: '#3B82F6',        // 科技蓝（CTA）
          'blue-soft': '#60A5FA', // 次级蓝
          'blue-dim': '#1E40AF',  // 暗蓝
          text: '#E5E7EB',        // 主文字
          'text-dim': '#9CA3AF',  // 次级文字
          'text-faint': '#4B5563',// 弱化文字
          green: '#10B981',       // 成功
          amber: '#F59E0B',       // 警告
          red: '#EF4444',         // 危险
        },
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],    // 科幻标题
        sans: ['Exo 2', 'Noto Sans SC', 'sans-serif'], // 正文
        mono: ['Roboto Mono', 'monospace'],     // 等宽数据
      },
      backgroundImage: {
        'scan-line': 'linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.03) 50%, transparent 100%)',
        'grid': 'linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'scan': 'scan 4s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
