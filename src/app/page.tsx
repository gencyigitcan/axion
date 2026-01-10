export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm lg:flex">
        <div className="glass-heavy rounded-xl p-12 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>

          <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-6 tracking-tight">
            Antigravity
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-lg mx-auto">
            Enterprise Sports Complex Management
            <br />
            <span className="text-sm opacity-50">v2.0.0 (2026 Edition)</span>
          </p>

          <div className="flex gap-4 justify-center">
            <a href="/login" className="px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-all shadow-[0_0_20px_-5px_var(--color-primary)]">
              Giriş Yap
            </a>
            <a href="/demo" className="px-6 py-3 rounded-lg glass hover:bg-white/10 transition-all border border-white/10 hover:border-primary/50">
              Canlı Demo
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
