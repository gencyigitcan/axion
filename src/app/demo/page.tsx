'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { Users, User, ArrowRight, Lock, Loader2, Activity, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// Types (simplified for demo)
type DemoSession = {
    id: string
    start_time: string
    end_time: string
    capacity: number
    current_bookings_count: number
    class_type: { name: string } | null
    trainer: { full_name: string } | null
}

type DemoClassType = {
    id: string
    name: string
    description: string | null
}

export default function DemoPage() {
    const [sessions, setSessions] = useState<DemoSession[]>([])
    const [classTypes, setClassTypes] = useState<DemoClassType[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedSession, setSelectedSession] = useState<DemoSession | null>(null)
    const [selectedClassType, setSelectedClassType] = useState<DemoClassType | null>(null)
    const supabase = createClient()

    // Use current week
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))

    useEffect(() => {
        fetchDemoData()
    }, [])

    const fetchDemoData = async () => {
        // Determine the Demo Tenant ID first (from seed script logic)
        // Since we can't easily guess the random ID from seed, we'll fetch ANY tenant that looks like "Demo"
        // OR just fetch ALL sessions if public policy allows.
        // Let's try to find the tenant first for cleaner filtering.

        try {
            const { data: tenant } = await supabase
                .from('tenants')
                .select('id')
                .ilike('name', '%Demo%')
                .limit(1)
                .single()

            let query = supabase
                .from('class_sessions')
                .select(`
                id, start_time, end_time, capacity, current_bookings_count,
                class_type:class_types(name),
                trainer:user_profiles(full_name)
            `)
                .gte('start_time', weekDays[0].toISOString())
                .lt('start_time', addDays(weekDays[6], 1).toISOString())

            if (tenant) {
                query = query.eq('tenant_id', tenant.id)

                // Also fetch class types for this tenant
                const { data: ctData } = await supabase
                    .from('class_types')
                    .select('id, name, description')
                    .eq('tenant_id', tenant.id)

                setClassTypes(ctData || [])
            } else {
                // Fallback if no demo tenant found (fetch all)
                const { data: ctData } = await supabase.from('class_types').select('id, name, description').limit(10)
                setClassTypes(ctData || [])
            }

            const { data, error } = await query

            if (error) throw error
            setSessions(data as any || [])

        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8">
            {/* Demo Header */}
            <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                        Canlı Demo Modu
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Şu an okuma modundasınız. Gerçek verileri görmektesiniz.
                    </p>
                </div>
                <Link href="/onboarding" className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-[0_0_15px_-5px_var(--color-primary)] flex items-center gap-2">
                    Kendi Salonunu Kur
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Featured Classes */}
            <div className="max-w-7xl mx-auto mb-10">
                <h2 className="text-xl font-semibold mb-4 text-white/80 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Popüler Dersler
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {classTypes.map((ct, i) => (
                        <motion.div
                            key={ct.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="glass p-5 rounded-xl border border-white/10 hover:border-primary/30 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Activity className="w-12 h-12" />
                            </div>
                            <h3 className="font-bold text-lg text-white mb-2">{ct.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{ct.description || 'Modern ekipmanlarla profesyonel antrenman deneyimi.'}</p>

                            <div className="mt-4 flex items-center text-xs font-medium text-primary">
                                <button
                                    onClick={() => setSelectedClassType(ct)}
                                    className="group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 hover:underline"
                                >
                                    Detayları İncele <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Calendar View (Read Only) */}
            <div className="max-w-7xl mx-auto h-[700px] flex flex-col">
                <div className="flex-1 grid grid-cols-7 gap-px bg-white/5 border border-white/10 rounded-2xl overflow-hidden glass">
                    {weekDays.map((day, i) => {
                        const isToday = isSameDay(day, new Date())
                        const daySessions = sessions.filter(s => isSameDay(new Date(s.start_time), day))

                        return (
                            <div key={i} className="flex flex-col h-full bg-background/50 hover:bg-white/5 transition-colors group">
                                <div className={cn("p-3 text-center border-b border-white/5", isToday && "bg-primary/10")}>
                                    <div className={cn("text-xs uppercase font-semibold mb-1", isToday ? "text-primary" : "text-muted-foreground")}>
                                        {format(day, 'EEEE')}
                                    </div>
                                    <div className={cn("text-2xl font-bold", isToday ? "text-primary" : "text-white/80")}>
                                        {format(day, 'd')}
                                    </div>
                                </div>

                                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                                    {daySessions.map(session => (
                                        <div
                                            key={session.id}
                                            className="p-3 rounded-lg bg-white/5 border border-white/5 relative overflow-hidden flex flex-col gap-1 cursor-default opacity-80 hover:opacity-100 transition-opacity"
                                        >
                                            <div className="absolute top-0 left-0 w-1 h-full bg-white/20" />

                                            <div
                                                className="absolute inset-0 cursor-pointer"
                                                onClick={() => setSelectedSession(session)}
                                            />

                                            <div className="flex justify-between items-start pointer-events-none">
                                                <span className="text-xs font-mono font-bold text-white/70">
                                                    {format(new Date(session.start_time), 'HH:mm')}
                                                </span>
                                                <div className="flex items-center gap-1 text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-muted-foreground">
                                                    <Users className="w-3 h-3" />
                                                    {session.current_bookings_count}/{session.capacity}
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-semibold text-white/90 line-clamp-1">{session.class_type?.name}</h4>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                    <User className="w-3 h-3" />
                                                    <span className="truncate">{session.trainer?.full_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {daySessions.length === 0 && (
                                        <div className="text-center py-4 opacity-20 text-xs">Ders Yok</div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Overlay Alert */}
            <div className="fixed bottom-8 right-8 z-50">
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 shadow-2xl flex items-center gap-4 max-w-sm">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <Lock className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm">Sadece İzleme Modu</h4>
                        <p className="text-xs text-muted-foreground">Rezervasyon yapmak için giriş yapmalısınız.</p>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {/* Class Type Detail Modal */}
                {selectedClassType && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                            onClick={() => setSelectedClassType(null)}
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
                                    <h2 className="absolute bottom-4 left-6 text-2xl font-bold text-white">{selectedClassType.name}</h2>
                                </div>
                                <div className="p-6">
                                    <p className="text-muted-foreground leading-relaxed">
                                        {selectedClassType.description || 'Bu ders için henüz detaylı açıklama girilmemiş.'}
                                    </p>
                                    <div className="mt-6 flex justify-end">
                                        <button
                                            onClick={() => setSelectedClassType(null)}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
                                        >
                                            Kapat
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}

                {/* Session Detail Modal */}
                {selectedSession && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                            onClick={() => setSelectedSession(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
                        >
                            <div className="glass-heavy p-6 rounded-2xl border border-white/10 shadow-2xl">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-white mb-1">{selectedSession.class_type?.name}</h2>
                                        <p className="text-sm text-primary flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {selectedSession.trainer?.full_name}
                                        </p>
                                    </div>
                                    <div className="bg-white/10 px-3 py-1 rounded text-xs font-mono text-white/80">
                                        {format(new Date(selectedSession.start_time), 'HH:mm')}
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                                <Users className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground">Kontenjan</div>
                                                <div className="text-sm font-semibold text-white">
                                                    {selectedSession.current_bookings_count} / {selectedSession.capacity}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${(selectedSession.current_bookings_count / selectedSession.capacity) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="text-sm text-muted-foreground">
                                        Bu bir demo dersidir. Rezervasyon yapmak için sisteme giriş yapmalısınız.
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSelectedSession(null)}
                                        className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium text-muted-foreground transition-colors"
                                    >
                                        Kapat
                                    </button>
                                    <Link
                                        href="/login"
                                        className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 rounded-xl text-sm font-medium text-white shadow-[0_0_20px_-5px_var(--color-primary)] flex items-center justify-center gap-2"
                                    >
                                        <Lock className="w-4 h-4" />
                                        Giriş Yap
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
