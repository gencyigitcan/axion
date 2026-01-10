'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, FolderOpen, Loader2, Check } from 'lucide-react'
import { motion } from 'framer-motion'

// Types
type ClassType = {
    id: string
    name: string
}

type Package = {
    id: string
    name: string
    price: number
    validity_days: number
    credit_count: number
    allowed_class_type_ids: string[]
}

export default function PackagesPage() {
    const [packages, setPackages] = useState<Package[]>([])
    const [classTypes, setClassTypes] = useState<ClassType[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        validity_days: '30',
        credit_count: '10',
        allowed_class_type_ids: [] as string[]
    })

    const supabase = createClient()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [packagesRes, classTypesRes] = await Promise.all([
                supabase.from('packages').select('*').order('created_at', { ascending: false }),
                supabase.from('class_types').select('id, name').order('name')
            ])

            if (packagesRes.error) throw packagesRes.error
            if (classTypesRes.error) throw classTypesRes.error

            setPackages(packagesRes.data || [])
            setClassTypes(classTypesRes.data || [])
        } catch (error: any) {
            toast.error('Veri yüklenemedi', { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsCreating(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Oturum yok')

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('tenant_id')
                .eq('user_id', user.id)
                .single()

            if (!profile) throw new Error('Profil bulunamadı')

            if (formData.allowed_class_type_ids.length === 0) {
                throw new Error('En az bir ders tipi seçmelisiniz')
            }

            const { data, error } = await supabase
                .from('packages')
                .insert({
                    tenant_id: profile.tenant_id,
                    name: formData.name,
                    price: parseFloat(formData.price),
                    validity_days: parseInt(formData.validity_days),
                    credit_count: parseInt(formData.credit_count),
                    allowed_class_type_ids: formData.allowed_class_type_ids
                })
                .select()
                .single()

            if (error) throw error

            setPackages([data, ...packages])
            setFormData({
                name: '',
                price: '',
                validity_days: '30',
                credit_count: '10',
                allowed_class_type_ids: []
            })
            toast.success('Paket Oluşturuldu')
        } catch (error: any) {
            toast.error('Hata', { description: error.message })
        } finally {
            setIsCreating(false)
        }
    }

    const toggleClassType = (id: string) => {
        setFormData(prev => {
            const exists = prev.allowed_class_type_ids.includes(id)
            return {
                ...prev,
                allowed_class_type_ids: exists
                    ? prev.allowed_class_type_ids.filter(c => c !== id)
                    : [...prev.allowed_class_type_ids, id]
            }
        })
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                    Paket Yönetimi
                </h1>
                <p className="text-muted-foreground mt-2">
                    Üyelerinize sunduğunuz fiyat ve hak paketlerini yönetin.
                </p>
            </div>

            {/* Create Section */}
            <div className="glass p-6 rounded-xl border border-white/10">
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Yeni Paket Tanımla
                </h2>

                <form onSubmit={handleCreate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Paket Adı</label>
                            <input
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Örn: 10 Derslik PT"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Fiyat (TL)</label>
                            <input
                                required
                                type="number"
                                min="0"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                placeholder="0.00"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Geçerlilik (Gün)</label>
                            <input
                                required
                                type="number"
                                min="1"
                                value={formData.validity_days}
                                onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Toplam Hak (Ders Sayısı)</label>
                            <input
                                required
                                type="number"
                                min="1"
                                value={formData.credit_count}
                                onChange={(e) => setFormData({ ...formData, credit_count: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground ml-1">Bu paket hangi derslerde geçerli?</label>
                        <div className="flex flex-wrap gap-2">
                            {classTypes.length === 0 && <p className="text-sm text-destructive opacity-70">Önce Lütfen Ders Tipi Ekleyin</p>}
                            {classTypes.map(ct => {
                                const isSelected = formData.allowed_class_type_ids.includes(ct.id)
                                return (
                                    <button
                                        key={ct.id}
                                        type="button"
                                        onClick={() => toggleClassType(ct.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all ${isSelected
                                                ? 'bg-primary/20 border-primary text-white shadow-[0_0_10px_-4px_var(--color-primary)]'
                                                : 'bg-black/20 border-white/10 text-muted-foreground hover:bg-white/5'
                                            }`}
                                    >
                                        {isSelected && <Check className="w-3 h-3" />}
                                        {ct.name}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isCreating || !formData.name || formData.allowed_class_type_ids.length === 0}
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_-5px_var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Paketi Kaydet'}
                        </button>
                    </div>
                </form>
            </div>

            {/* List Section */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-12 text-muted-foreground animate-pulse">Yükleniyor...</div>
                ) : packages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground glass rounded-xl border-dashed border border-white/10">
                        Henüz bir paket tanımlanmamış.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {packages.map((pkg) => (
                            <motion.div
                                key={pkg.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="glass p-6 rounded-xl border border-white/5 hover:border-primary/20 transition-colors group relative flex flex-col justify-between h-full"
                            >
                                <div>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/10">
                                            <FolderOpen className="w-5 h-5" />
                                        </div>
                                        <span className="text-xl font-bold tracking-tight text-white">{pkg.price} ₺</span>
                                    </div>

                                    <h3 className="font-semibold text-lg text-white/90 mb-1">{pkg.name}</h3>
                                    <div className="flex gap-3 text-xs text-muted-foreground mb-4">
                                        <span className="bg-white/5 px-2 py-1 rounded">{pkg.credit_count} Hak</span>
                                        <span className="bg-white/5 px-2 py-1 rounded">{pkg.validity_days} Gün</span>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Geçerli Dersler</p>
                                        <div className="flex flex-wrap gap-1">
                                            {pkg.allowed_class_type_ids.map(id => {
                                                const ct = classTypes.find(c => c.id === id)
                                                return ct ? (
                                                    <span key={id} className="text-xs text-white/60 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">{ct.name}</span>
                                                ) : null
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
                                    <button className="text-xs text-muted-foreground hover:text-white transition-colors">Düzenle</button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
