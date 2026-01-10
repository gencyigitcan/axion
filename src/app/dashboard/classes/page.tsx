'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
    Loader2, Plus, Trash2, Edit2, Search,
    Activity, ArrowRight, CheckCircle, Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ClassesPage() {
    const [classTypes, setClassTypes] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    // Modal State (For Admin CRUD)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [newClassName, setNewClassName] = useState('')
    const [newClassDesc, setNewClassDesc] = useState('')

    // Detail Modal State (For Members/Admins to view info)
    const [selectedClass, setSelectedClass] = useState<any | null>(null)

    const supabase = createClient()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Check Role
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('user_id', user.id)
                .single()

            setIsAdmin(profile?.role === 'admin' || profile?.role === 'owner')

            // Fetch Classes
            const { data, error } = await supabase
                .from('class_types')
                .select('*')
                .order('name')

            if (error) throw error
            setClassTypes(data || [])
        } catch (error: any) {
            toast.error('Hata', { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('tenant_id')
                .eq('user_id', user.id)
                .single()

            const { data, error } = await supabase
                .from('class_types')
                .insert({
                    tenant_id: profile?.tenant_id,
                    name: newClassName,
                    description: newClassDesc
                })
                .select()
                .single()

            if (error) throw error

            setClassTypes([...classTypes, data])
            setIsModalOpen(false)
            setNewClassName('')
            setNewClassDesc('')
            toast.success('Ders Oluşturuldu')
        } catch (error: any) {
            toast.error('Hata', { description: error.message })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Bu ders tipini silmek istediğinize emin misiniz?')) return
        try {
            const { error } = await supabase
                .from('class_types')
                .delete()
                .eq('id', id)

            if (error) throw error
            setClassTypes(classTypes.filter(c => c.id !== id))
            toast.success('Silindi')
        } catch (error: any) {
            toast.error('Hata', { description: error.message })
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Ders Kataloğu
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Stüdyomuzda sunulan eğitimler ve detayları.
                    </p>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-[0_0_15px_-5px_var(--color-primary)] transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Yeni Ders Ekle
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : classTypes.length === 0 ? (
                <div className="text-center p-12 glass rounded-xl border border-white/10 text-muted-foreground">
                    Henüz ders tanımlanmamış.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {classTypes.map((ct, i) => (
                        <motion.div
                            key={ct.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass p-6 rounded-xl border border-white/10 hover:border-primary/30 transition-all group relative overflow-hidden flex flex-col justify-between"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Activity className="w-20 h-20" />
                            </div>

                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-xl text-white">{ct.name}</h3>
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleDelete(ct.id)}
                                            className="text-white/20 hover:text-red-400 p-1 rounded transition-colors z-20"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-6">
                                    {ct.description || 'Açıklama girilmemiş.'}
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedClass(ct)}
                                className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-primary font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                Detayları İncele
                                <ArrowRight className="w-3 h-3" />
                            </button>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* ADMIN EDIT/CREATE MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
                        >
                            <div className="glass-heavy p-6 rounded-2xl border border-white/10 shadow-2xl">
                                <h2 className="text-xl font-bold mb-6 text-white">Yeni Ders Tipi</h2>
                                <form onSubmit={handleCreate} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-muted-foreground">Ders Adı</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Örn: Reformer Pilates"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm outline-none focus:ring-2 ring-primary/50"
                                            value={newClassName}
                                            onChange={e => setNewClassName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-muted-foreground">Açıklama</label>
                                        <textarea
                                            required
                                            rows={3}
                                            placeholder="Ders içeriği hakkında kısa bilgi..."
                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm outline-none focus:ring-2 ring-primary/50 resize-none"
                                            value={newClassDesc}
                                            onChange={e => setNewClassDesc(e.target.value)}
                                        />
                                    </div>
                                    <div className="pt-4 flex justify-end gap-3">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 hover:bg-white/5 rounded-lg text-sm text-muted-foreground">İptal</button>
                                        <button type="submit" className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-[0_0_15px_-5px_var(--color-primary)]">Oluştur</button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* DETAIL MODAL */}
            <AnimatePresence>
                {selectedClass && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                            onClick={() => setSelectedClass(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
                        >
                            <div className="glass-heavy p-0 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                                <div className="h-32 bg-gradient-to-r from-primary/20 to-purple-500/20 flex items-center justify-center relative">
                                    <Activity className="w-16 h-16 text-white/20" />
                                    <h2 className="absolute bottom-4 left-6 text-2xl font-bold text-white">{selectedClass.name}</h2>
                                </div>
                                <div className="p-8">
                                    <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                                        <Info className="w-4 h-4" /> Hakkında
                                    </h3>
                                    <p className="text-muted-foreground leading-relaxed mb-6">
                                        {selectedClass.description}
                                    </p>

                                    <div className="flex items-center gap-2 text-sm text-white/50 bg-white/5 p-4 rounded-xl border border-white/5">
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                        Bu derse katılmak için uygun paketiniz olduğundan emin olun.
                                    </div>

                                    <div className="mt-8 flex justify-end">
                                        <button
                                            onClick={() => setSelectedClass(null)}
                                            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
                                        >
                                            Kapat
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
