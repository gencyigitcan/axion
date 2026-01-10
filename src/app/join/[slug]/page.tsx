'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Building2, ArrowRight, Loader2, CheckCircle, Mail, Lock, User } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

// ... (Rest of the previous content, same as above)
type Tenant = {
    id: string
    name: string
    subdomain_slug: string
    brand_config: any
}

export default function PublicJoinPage() {
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()

    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAuthLoading, setIsAuthLoading] = useState(false)
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup')

    // Auth Form
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')

    useEffect(() => {
        if (params.slug) fetchTenant(params.slug as string)
    }, [params.slug])

    const fetchTenant = async (slug: string) => {
        try {
            const { data, error } = await supabase
                .from('tenants')
                .select('*')
                .eq('subdomain_slug', slug)
                .single()

            if (error || !data) throw new Error('Stüdyo bulunamadı')
            setTenant(data)
        } catch (error) {
            toast.error('Giriş başarısız', { description: 'Böyle bir stüdyo bulunamadı.' })
            router.push('/')
        } finally {
            setIsLoading(false)
        }
    }

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsAuthLoading(true)

        try {
            // 1. Auth Logic using Supabase
            let user = null

            if (authMode === 'signup') {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } }
                })
                if (error) throw error
                user = data.user
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                })
                if (error) throw error
                user = data.user
            }

            if (!user) throw new Error('Kullanıcı doğrulanamadı')

            // 2. Check/Create Profile in this Tenant
            // We need to see if this user is already a member of THIS tenant
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', user.id)
                .eq('tenant_id', tenant!.id)
                .single()

            if (!profile) {
                // If not a member, add them as 'member'
                const { error: joinError } = await supabase
                    .from('user_profiles')
                    .insert({
                        user_id: user.id,
                        tenant_id: tenant!.id,
                        role: 'member',
                        email: email,
                        full_name: fullName || email.split('@')[0]
                    })

                if (joinError) throw joinError
                toast.success(`Hoş Geldiniz!`, { description: `${tenant!.name} üyeliğiniz oluşturuldu.` })
            } else {
                toast.success(`Tekrar Hoş Geldiniz!`)
            }

            // 3. Redirect to Dashboard
            router.push('/dashboard')
            router.refresh()

        } catch (error: any) {
            toast.error('İşlem Başarısız', { description: error.message })
        } finally {
            setIsAuthLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        )
    }

    if (!tenant) return null

    return (
        <div className="min-h-screen flex flex-col md:flex-row">

            {/* Left Side - Studio Info */}
            <div className="relative w-full md:w-1/2 lg:w-2/5 p-8 flex flex-col justify-between overflow-hidden bg-zinc-900 border-r border-white/5">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
                </div>

                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                        Antigravity Home
                    </Link>

                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-6 border border-primary/20 shadow-[0_0_30px_-10px_var(--color-primary)]">
                        <Building2 className="w-8 h-8" />
                    </div>

                    <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
                        {tenant.name}
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Spora başlamak için harika bir gün. Stüdyomuza katıl ve hemen rezervasyon yapmaya başla.
                    </p>
                </div>

                <div className="relative z-10 mt-12 bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Neden Biz?
                    </h3>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                        <li className="flex gap-3">
                            <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-primary flex-shrink-0" />
                            Profesyonel Eğitmen Kadrosu
                        </li>
                        <li className="flex gap-3">
                            <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-primary flex-shrink-0" />
                            Online Rezervasyon ve Takip
                        </li>
                        <li className="flex gap-3">
                            <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-primary flex-shrink-0" />
                            Esnek Paket Seçenekleri
                        </li>
                    </ul>
                </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="w-full md:w-1/2 lg:w-3/5 p-8 flex items-center justify-center bg-black">
                <div className="w-full max-w-md">
                    <div className="mb-8 text-center md:text-left">
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {authMode === 'signup' ? 'Üyelik Oluştur' : 'Giriş Yap'}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            {authMode === 'signup'
                                ? 'Bilgilerini gir ve hemen aramıza katıl.'
                                : 'Hesabına erişmek için bilgilerini gir.'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        {authMode === 'signup' && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground ml-1">Ad Soyad</label>
                                <div className="relative group/input">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white placeholder:text-muted-foreground/50"
                                        placeholder="Ad Soyad"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Email</label>
                            <div className="relative group/input">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white placeholder:text-muted-foreground/50"
                                    placeholder="ornek@email.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Şifre</label>
                            <div className="relative group/input">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white placeholder:text-muted-foreground/50"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isAuthLoading}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 rounded-lg transition-all shadow-[0_0_20px_-5px_var(--color-primary)] mt-6 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isAuthLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'signup' ? 'Kayıt Ol ve Katıl' : 'Giriş Yap')}
                            {!isAuthLoading && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                            className="text-sm text-muted-foreground hover:text-white transition-colors hover:underline"
                        >
                            {authMode === 'signup'
                                ? 'Zaten hesabın var mı? Giriş Yap'
                                : 'Hesabın yok mu? Kayıt Ol'}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    )
}
