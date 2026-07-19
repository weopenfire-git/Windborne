// 首页占位（模块 08 前端页面阶段重写）
// 目前仅作为开发环境可访问性验证

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="hud-card-glow relative max-w-md p-8 text-center scan-line overflow-hidden">
        <p className="font-display text-xs tracking-[0.3em] text-hud-blue-soft mb-4">
          WINDBORNE
        </p>
        <h1 className="font-display text-3xl text-hud-text text-glow mb-2">
          飞行日志
        </h1>
        <p className="font-mono text-sm text-hud-text-dim mb-6">
          v2.0 · 开发中
        </p>
        <div className="space-y-2 text-left">
          <p className="font-mono text-xs text-hud-text-dim">
            <span className="badge-blue mr-2">M01</span> 数据库 ✓
          </p>
          <p className="font-mono text-xs text-hud-text-dim">
            <span className="badge-hud mr-2">M02</span> 认证 · 开发中
          </p>
          <p className="font-mono text-xs text-hud-text-faint">
            <span className="badge-hud mr-2">M03-08</span> 待开发
          </p>
        </div>
      </div>
    </main>
  );
}
