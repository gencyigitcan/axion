'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Loader2, Lock, Mail, ArrowRight } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [mode, setMode] = useState<'signin' | 'signup'>('signin')
    const router = useRouter()
    const supabase = createClient()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                toast.success('Giriş Başarılı', { description: 'Yönlendiriliyorsunuz...' })
                router.push('/dashboard')
                router.refresh()
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                })
                if (error) throw error
                toast.success('Kayıt Başarılı', { description: 'Lütfen email adresinizi doğrulayın.' })
                setMode('signin')
            }
        } catch (error: any) {
            toast.error('İşlem Başarısız', { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md z-10"
            >
                <div className="glass p-8 rounded-2xl shadow-2xl relative border border-white/10 overflow-hidden group">

                    {/* Top Gradient Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60">
                            Antigravity
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {mode === 'signin' ? 'Kurumsal Hesabınıza Erişin' : 'Yeni Organizasyon Başlatın'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Kullanıcı Email</label>
                            <div className="relative group/input">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-black/30 placeholder:text-muted-foreground/50"
                                    placeholder="admin@studio.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Şifre</label>
                            <div className="relative group/input">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-black/30 placeholder:text-muted-foreground/50"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg transition-all shadow-[0_0_20px_-5px_var(--color-primary)] hover:shadow-[0_0_25px_-5px_var(--color-primary)] active:scale-[0.98] flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    {mode === 'signin' ? 'Giriş Yap' : 'Kayıt Ol'}
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                            className="text-xs text-muted-foreground hover:text-white transition-colors hover:underline"
                        >
                            {mode === 'signin'
                                ? "Hesabınız yok mu? Kayıt Olun"
                                : "Zaten üye misiniz? Giriş Yapın"}
                        </button>
                    </div>

                </div>

                {/* Footer Info */}
                <p className="text-center text-[10px] text-white/20 mt-8 font-mono">
                    SECURE ENCRYPTED CONNECTION • 2026 ENTERPRISE
                </p>
            </motion.div>
        </div>
    )
}
