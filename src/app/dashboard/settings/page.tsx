'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Save, Building, User, Palette } from 'lucide-react'

export default function SettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [tenant, setTenant] = useState<any>(null)

    // Form States
    const [fullName, setFullName] = useState('')
    const [gymName, setGymName] = useState('')
    const [brandColor, setBrandColor] = useState('#3b82f6') // default blue

    const supabase = createClient()

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            // 1. Get User
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) return

            // 2. Get Profile & Tenant
            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select(`
          *,
          tenant:tenants(*)
        `)
                .eq('user_id', authUser.id)
                .single()

            if (error) throw error

            setUser(profile)
            setFullName(profile.full_name || '')

            if (profile.tenant) {
                setTenant(profile.tenant)
                setGymName(profile.tenant.name)
                // @ts-ignore
                setBrandColor(profile.tenant.brand_config?.colors?.primary || '#3b82f6')
            }

        } catch (error: any) {
            toast.error('Ayarlar yüklenemedi', { description: error.message })
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ full_name: fullName })
                .eq('id', user.id)

            if (error) throw error
            toast.success('Profil güncellendi')
        } catch (error: any) {
            toast.error('Hata', { description: error.message })
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateTenant = async (e: React.FormEvent) => {
        e.preventDefault()
        if (user.role !== 'owner' && user.role !== 'admin') {
            toast.error('Yetkisiz işlem', { description: 'Sadece yöneticiler stüdyo ayarlarını değiştirebilir.' })
            return
        }
        setSaving(true)
        try {
            const { error } = await supabase
                .from('tenants')
                .update({
                    name: gymName,
                    brand_config: { colors: { primary: brandColor } }
                })
                .eq('id', tenant.id)

            if (error) throw error
            toast.success('Stüdyo ayarları güncellendi')

            // Update local state to reflect check
            setTenant({ ...tenant, name: gymName, brand_config: { colors: { primary: brandColor } } })

        } catch (error: any) {
            toast.error('Hata', { description: error.message })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="p-8 flex items-center justify-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Yükleniyor...</div>
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                    Ayarlar
                </h1>
                <p className="text-muted-foreground mt-2">Profilinizi ve stüdyo tercihlerinizi yapılandırın.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* User Profile Settings */}
                <div className="glass p-6 rounded-xl border border-white/10">
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Kullanıcı Ayarları
                    </h2>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Ad Soyad</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:ring-2 ring-primary/50 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">E-posta</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full bg-white/5 border border-white/5 rounded-lg p-3 text-sm text-muted-foreground cursor-not-allowed"
                            />
                        </div>
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Kaydet
                            </button>
                        </div>
                    </form>
                </div>

                {/* Tenant Settings (Admin/Owner Only) */}
                {(user.role === 'owner' || user.role === 'admin') && (
                    <div className="glass p-6 rounded-xl border border-white/10">
                        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                            <Building className="w-5 h-5 text-primary" />
                            Stüdyo Ayarları
                        </h2>
                        <form onSubmit={handleUpdateTenant} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Stüdyo Adı</label>
                                <input
                                    type="text"
                                    value={gymName}
                                    onChange={e => setGymName(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:ring-2 ring-primary/50 outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Palette className="w-4 h-4" />
                                    Marka Rengi
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={brandColor}
                                        onChange={e => setBrandColor(e.target.value)}
                                        className="h-10 w-20 bg-transparent border-0 cursor-pointer"
                                    />
                                    <span className="text-xs text-muted-foreground font-mono">{brandColor}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Bu renk dashboard genelinde (butonlar, vurgular) kullanılacaktır.</p>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_-5px_var(--color-primary)] flex items-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Değişiklikleri Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                )}

            </div>
        </div>
    )
}
