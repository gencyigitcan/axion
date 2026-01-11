'use client'

import React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

// Mock Data (Replace with supabase fetch)
const BLOG_POSTS = [
    {
        id: '1',
        title: "Pilatesin Bilinmeyen 5 Faydası",
        slug: "pilatesin-faydalari",
        excerpt: "Omurga sağlığından zihin açıklığına, pilatesin vücudunuza kattığı inanılmaz etkiler.",
        image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=2070&auto=format&fit=crop",
        created_at: new Date().toISOString()
    },
    {
        id: '2',
        title: "Doğru Beslenme Rehberi",
        slug: "dogru-beslenme",
        excerpt: "Antrenman öncesi ve sonrası neler yemelisiniz? Profesyonel tavsiyeler.",
        image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2053&auto=format&fit=crop",
        created_at: new Date().toISOString()
    }
]

export default function StudioBlogPage() {
    const params = useParams()
    const slug = params?.slug as string

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Navbar (Compact) */}
            <nav className="border-b border-white/10 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link href={`/studio/${slug}`} className="font-bold text-xl hover:text-primary transition-colors">
                        ← Stüdyo Ana Sayfa
                    </Link>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-16">
                <header className="mb-16 text-center">
                    <h1 className="text-4xl md:text-6xl font-bold mb-4">Blog & Haberler</h1>
                    <p className="text-muted-foreground text-lg">Sağlıklı yaşam ipuçları ve stüdyodan haberler.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {BLOG_POSTS.map(post => (
                        <Link
                            key={post.id}
                            href={`/studio/${slug}/blog/${post.slug}`}
                            className="group block rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-primary/50 transition-all"
                        >
                            <div className="aspect-video relative overflow-hidden">
                                <img
                                    src={post.image}
                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                    alt={post.title}
                                />
                            </div>
                            <div className="p-6">
                                <div className="text-xs text-primary font-medium mb-3">
                                    {format(new Date(post.created_at), 'd MMMM yyyy', { locale: tr })}
                                </div>
                                <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                                    {post.title}
                                </h2>
                                <p className="text-muted-foreground text-sm line-clamp-3">
                                    {post.excerpt}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    )
}
