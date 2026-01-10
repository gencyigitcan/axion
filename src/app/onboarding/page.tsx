'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Building2, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'

export default function OnboardingPage() {
    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
    })

    const router = useRouter()
    const supabase = createClient()

    // Auto-generate slug from name
    useEffect(() => {
        const cleanName = formData.name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '')

        if (!cleanName) {
            setFormData(prev => ({ ...prev, slug: '' }))
            return
        }

        // Use Date.now() for better uniqueness than random number
        const slug = `${cleanName}-${Date.now().toString(36)}`

        setFormData(prev => ({ ...prev, slug }))
    }, [formData.name])

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Oturum bulunamadı')

            // 1. Create Tenant
            const { data: tenant, error: tenantError } = await supabase
                .from('tenants')
                .insert({
                    name: formData.name,
                    subdomain_slug: formData.slug,
                    brand_config: {
                        colors: { primary: '#7c3aed' } // Default Violet
                    }
                })
                .select()
                .single()

            if (tenantError) throw tenantError

            // 2. Create Owner Profile
            const { error: profileError } = await supabase
                .from('user_profiles')
                .insert({
                    user_id: user.id,
                    tenant_id: tenant.id,
                    role: 'owner',
                    email: user.email,
                    full_name: 'İşletme Sahibi' // Can be generic for now
                })

            if (profileError) throw profileError

            toast.success('Stüdyo Kurulumu Tamamlandı!', {
                description: `${formData.name} başarıyla oluşturuldu.`
            })

            router.push('/dashboard')
            router.refresh()

        } catch (error: any) {
            console.error(error)
            toast.error('Kurulum Hatası', {
                description: error.message || 'Bilinmeyen bir hata oluştu.'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Splashes */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl z-10"
            >
                <div className="glass p-8 md:p-12 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">

                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

                    <div className="mb-10 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 text-primary mb-6 border border-primary/20 shadow-[0_0_30px_-10px_var(--color-primary)]">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <h1 className="text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                            Stüdyonuzu Yaratalım
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Birkaç saniye içinde kendi dijital spor kompleksinizi kurun.
                        </p>
                    </div>

                    <form onSubmit={handleCreateTenant} className="space-y-8 max-w-md mx-auto">

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium ml-1">İşletme Adı</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Örn: Antigravity Pilates Studio"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-black/30 placeholder:text-muted-foreground/40"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium ml-1 flex justify-between">
                                    <span>Stüdyo URL (Slug)</span>
                                    <span className="text-muted-foreground font-normal text-xs opacity-70">Otomatik Oluşturulur</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-5 top-4 text-muted-foreground/50 select-none">antigravity.app/</span>
                                    <input
                                        type="text"
                                        required
                                        readOnly
                                        value={formData.slug}
                                        className="w-full bg-black/10 border border-white/5 rounded-xl pl-36 pr-5 py-4 text-base text-muted-foreground cursor-not-allowed font-mono opacity-70"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !formData.name}
                            className="w-full group relative overflow-hidden rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold py-4 transition-all shadow-[0_0_20px_-5px_var(--color-primary)] hover:shadow-[0_0_30px_-5px_var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-2">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Kuruluyor...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Başla</span>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                            {/* Shine Effect */}
                            <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        </button>

                    </form>

                </div>
            </motion.div>
        </div>
    )
}
