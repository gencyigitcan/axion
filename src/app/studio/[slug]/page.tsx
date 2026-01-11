'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Instagram, Facebook, Phone, MapPin, Mail, ArrowRight, User } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function StudioLandingPage() {
    const params = useParams()
    const slug = params?.slug as string // 'antigravity-maslak'

    // Mock Data (In real app, fetch from 'site_pages' based on slug)
    const studioInfo = {
        name: "Antigravity Maslak",
        description: "Şehrin kalbinde, yerçekimine meydan okuyan bir spor deneyimi.",
        heroImage: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=2070&auto=format&fit=crop",
        address: "Maslak Mah. Büyükdere Cad. No:1, Sarıyer/İstanbul",
        phone: "+90 212 555 0000",
        instagram: "@antigravitymaslak"
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary/30">
            {/* Navbar */}
            <nav className="fixed w-full z-50 glass border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                        {studioInfo.name}
                    </div>
                    <div className="flex items-center gap-6 text-sm font-medium">
                        <Link href={`/studio/${slug}`} className="text-white hover:text-primary transition-colors">Ana Sayfa</Link>
                        <Link href={`/studio/${slug}/blog`} className="text-muted-foreground hover:text-white transition-colors">Blog</Link>
                        <Link href="/login" className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90">Üye Girişi</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0">
                    <img src={studioInfo.heroImage} className="w-full h-full object-cover opacity-60" alt="Hero" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                </div>

                <div className="relative z-10 text-center max-w-4xl px-6 space-y-6">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-5xl md:text-7xl font-bold tracking-tight"
                    >
                        Limitlerini <span className="text-primary italic">Zorla</span>.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="text-xl text-white/80 max-w-2xl mx-auto"
                    >
                        {studioInfo.description}
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex gap-4 justify-center"
                    >
                        <Link href="/join/antigravity" className="px-8 py-4 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-all shadow-[0_0_20px_-5px_var(--color-primary)]">
                            Ücretsiz Dene
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Features (Static for MVP) */}
            <section className="py-24 px-6 bg-zinc-900/50">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/50 transition-colors group">
                        <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                            <User className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Uzman Eğitmenler</h3>
                        <p className="text-muted-foreground">Alanında en iyi sertifikalara sahip eğitmen kadrosu.</p>
                    </div>
                    <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/50 transition-colors group">
                        <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Premium Lokasyon</h3>
                        <p className="text-muted-foreground">Kolay ulaşılabilir, ferah ve hijyenik stüdyo ortamı.</p>
                    </div>
                    <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/50 transition-colors group">
                        <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-6 text-green-400 group-hover:scale-110 transition-transform">
                            <ArrowRight className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Kişisel Program</h3>
                        <p className="text-muted-foreground">Sana özel hazırlanan antrenman ve beslenme programları.</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/10 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-2xl font-bold">{studioInfo.name}</div>
                    <div className="flex gap-6 text-muted-foreground">
                        <a href="#" className="hover:text-white transition-colors"><Instagram className="w-6 h-6" /></a>
                        <a href="#" className="hover:text-white transition-colors"><Facebook className="w-6 h-6" /></a>
                        <a href="#" className="hover:text-white transition-colors"><Mail className="w-6 h-6" /></a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
