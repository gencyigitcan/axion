export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm lg:flex">
        <div className="glass-heavy rounded-xl p-12 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>

          <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-6 tracking-tight">
            Antigravity
          </h1>

          <div className="flex flex-col gap-4">
            <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-2">
              SaaS Spor Stüdyosu Yönetimi
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              <div className="glass p-4 rounded-xl border border-white/5">
                <h3 className="font-semibold text-lg text-primary mb-2">Üye Takibi</h3>
                <p className="text-sm text-muted-foreground">Üye bilgileri, evrak yönetimi ve devamsızlık takibi.</p>
              </div>
              <div className="glass p-4 rounded-xl border border-white/5">
                <h3 className="font-semibold text-lg text-primary mb-2">Online Rezervasyon</h3>
                <p className="text-sm text-muted-foreground">Üyeler için mobil uyumlu ders programı ve rezervasyon.</p>
              </div>
              <div className="glass p-4 rounded-xl border border-white/5">
                <h3 className="font-semibold text-lg text-primary mb-2">Beslenme Koçluğu</h3>
                <p className="text-sm text-muted-foreground">Kişiye özel beslenme planları ve günlük takip bildirimleri.</p>
              </div>
              <div className="glass p-4 rounded-xl border border-white/5">
                <h3 className="font-semibold text-lg text-primary mb-2">Gelişmiş Raporlar</h3>
                <p className="text-sm text-muted-foreground">Gelir gider, doluluk oranları ve eğitmen performansı.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center mt-12">
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
