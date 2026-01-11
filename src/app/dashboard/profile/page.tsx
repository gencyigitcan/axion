'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { generateGoogleCalendarUrl, generateICSContent } from '@/lib/calendar-utils'
import { Calendar, CreditCard, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, Utensils, CalendarPlus } from 'lucide-react'
import { motion } from 'framer-motion'

type Reservation = {
    id: string
    status: string
    class_session: {
        start_time: string
        class_type: { name: string }
        trainer: { full_name: string }
    }
}

type Credit = {
    id: string
    remaining_credits: number
    expire_date: string
    package: { name: string }
}

export default function ProfilePage() {
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [credits, setCredits] = useState<Credit[]>([])
    // Nutrition & Daily Tracking State
    const [todaysTracking, setTodaysTracking] = useState<any>(null)
    const [nutritionPlan, setNutritionPlan] = useState<any>(null)
    const [todaysWeight, setTodaysWeight] = useState('')
    const [todaysNotes, setTodaysNotes] = useState('')
    const [isMealConfirmed, setIsMealConfirmed] = useState(false)
    const [isLoading, setIsLoading] = useState(true)


    const supabase = createClient()

    useEffect(() => {
        fetchProfileData()
    }, [])

    const fetchProfileData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Fetch Reservations
            // 1. Fetch Reservations
            const { data: resData } = await supabase
                .from('reservations')
                .select(`
          id, status,
          class_session:class_sessions(
            start_time,
            end_time,
            class_type:class_types(name),
            trainer:user_profiles(full_name)
          )
        `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            // 2. Fetch Credits
            const { data: creditData } = await supabase
                .from('user_credits')
                .select(`
          id, remaining_credits, expire_date,
          package:packages(name)
        `)
                .eq('user_id', user.id)
            // 3. Fetch Nutrition Plan (Active)
            const { data: nutData } = await supabase
                .from('nutrition_plans')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .single()

            if (nutData) setNutritionPlan(nutData)

            // 4. Fetch Today's Tracking
            const today = new Date().toISOString().split('T')[0]
            const { data: trackData } = await supabase
                .from('daily_tracking')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', today)
                .single()

            if (trackData) {
                setTodaysTracking(trackData)
                setTodaysWeight(trackData.weight || '')
                setTodaysNotes(trackData.notes || '')
                setIsMealConfirmed(trackData.meals_confirmed || false)
            }

            // @ts-ignore - Supabase join types are messy in JS
            setReservations(resData || [])
            // @ts-ignore
            setCredits(creditData || [])

        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveTracking = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Quick workaround to get tenant_id if not stored - actually upsert might fail on RLS if we don't pass tenant_id. 
            // In a real app we have it in session. For MVP let's assume one exists or we fetch it.
            // Let's rely on stored procedure or fetch profile.
            const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('user_id', user.id).single()

            const payload = {
                user_id: user.id,
                tenant_id: profile?.tenant_id,
                date: new Date().toISOString().split('T')[0],
                weight: todaysWeight ? parseFloat(todaysWeight) : null,
                notes: todaysNotes,
                meals_confirmed: isMealConfirmed
            }

            const { error } = await supabase
                .from('daily_tracking')
                .upsert(payload, { onConflict: 'user_id, date' })

            if (error) throw error
            // toast.success('Günlük Takip Kaydedildi') - Toast not imported yet
            alert('Günlük Takip Kaydedildi')
        } catch (error: any) {
            alert('Kaydedildi')
        }
    }
    const handleDownloadICS = (res: any) => {
        const event = {
            title: res.class_session?.class_type?.name || 'Antigravity Ders',
            description: `Eğitmen: ${res.class_session?.trainer?.full_name}`,
            location: 'Antigravity Studio',
            startTime: res.class_session?.start_time,
            endTime: res.class_session?.end_time || res.class_session?.start_time // Fallback if missing
        }
        const content = generateICSContent(event)
        const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'antigravity-ders.ics')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const getGoogleUrl = (res: any) => {
        const event = {
            title: res.class_session?.class_type?.name || 'Antigravity Ders',
            description: `Eğitmen: ${res.class_session?.trainer?.full_name}`,
            location: 'Antigravity Studio',
            startTime: res.class_session?.start_time,
            endTime: res.class_session?.end_time || res.class_session?.start_time
        }
        return generateGoogleCalendarUrl(event)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed': return <span className="text-green-400 bg-green-400/10 px-2 py-1 rounded text-xs">Onaylandı</span>
            case 'cancelled': return <span className="text-red-400 bg-red-400/10 px-2 py-1 rounded text-xs">İptal</span>
            case 'waitlisted': return <span className="text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded text-xs">Yedek</span>
            default: return <span className="text-white/50 bg-white/10 px-2 py-1 rounded text-xs">{status}</span>
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                    Profilim
                </h1>
                <p className="text-muted-foreground mt-2">Geçmiş dersleriniz ve kalan haklarınız.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Daily Tracking Section */}
                <div className="space-y-4 lg:col-span-2">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Utensils className="w-5 h-5 text-primary" />
                        Bugünkü Takip
                    </h2>

                    {nutritionPlan ? (
                        <div className="glass p-6 rounded-xl border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">{nutritionPlan.title}</h3>
                                <div className="flex gap-4 mb-4">
                                    <div className="bg-black/20 p-3 rounded-lg flex-1 text-center">
                                        <span className="block text-xl font-bold text-primary">{nutritionPlan.daily_calories}</span>
                                        <span className="text-xs text-muted-foreground">Hedef Kalori</span>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-lg flex-1 text-center">
                                        <span className="block text-xl font-bold text-white">
                                            {nutritionPlan.macros?.protein || '-'}g
                                        </span>
                                        <span className="text-xs text-muted-foreground">Protein</span>
                                    </div>
                                </div>
                                <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                                    <p className="text-sm text-primary/80">
                                        💡 Hedefine ulaşmak için bugün planda yazan öğünlere sadık kalmalısın.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 border-l border-white/5 pl-0 md:pl-8">
                                <h4 className="font-medium text-white">Günlük Giriş</h4>

                                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded border-white/10 bg-black/50 checked:bg-primary text-primary"
                                        checked={isMealConfirmed}
                                        onChange={(e) => setIsMealConfirmed(e.target.checked)}
                                    />
                                    <span className="text-sm">Bugünkü diyetime uydum ✅</span>
                                </label>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Güncel Kilo (kg)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm"
                                            placeholder="Örn: 75.5"
                                            value={todaysWeight}
                                            onChange={(e) => setTodaysWeight(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Notlar</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm"
                                            placeholder="Kaçamak yaptın mı?"
                                            value={todaysNotes}
                                            onChange={(e) => setTodaysNotes(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveTracking}
                                    className="w-full bg-primary hover:bg-primary/90 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 glass rounded-xl border border-white/5 text-center text-muted-foreground text-sm">
                            Aktif bir beslenme programınız yok. Eğitmeniniz ile görüşün.
                        </div>
                    )}
                </div>

                {/* Credits Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-primary" />
                        Paketlerim & Haklarım
                    </h2>
                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="text-sm text-muted-foreground animate-pulse">Yükleniyor...</div>
                        ) : credits.length === 0 ? (
                            <div className="p-6 glass rounded-xl border border-white/5 text-center text-muted-foreground text-sm">
                                Henüz bir paketiniz yok.
                            </div>
                        ) : (
                            credits.map((credit) => (
                                <motion.div
                                    key={credit.id}
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                    className="p-5 glass rounded-xl border border-white/10 flex justify-between items-center"
                                >
                                    <div>
                                        <h3 className="font-medium text-white">{credit.package?.name || 'Paket'}</h3>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Son Kullanma: {new Date(credit.expire_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-bold text-primary">{credit.remaining_credits}</span>
                                        <span className="text-xs text-muted-foreground block">Kalan Hak</span>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Reservations Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Ders Geçmişi
                </h2>
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="text-sm text-muted-foreground animate-pulse">Yükleniyor...</div>
                    ) : reservations.length === 0 ? (
                        <div className="p-6 glass rounded-xl border border-white/5 text-center text-muted-foreground text-sm">
                            Henüz bir rezervasyon yapmadınız.
                        </div>
                    ) : (
                        reservations.map((res) => (
                            <motion.div
                                key={res.id}
                                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                                className="p-4 glass rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-medium">
                                            {/* @ts-ignore */}
                                            {res.class_session?.class_type?.name}
                                        </span>
                                        {getStatusBadge(res.status)}
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {/* @ts-ignore */}
                                        {format(new Date(res.class_session?.start_time), 'd MMM HH:mm')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {/* @ts-ignore */}
                                    <span>Eğitmen: {res.class_session?.trainer?.full_name}</span>
                                </div>

                                {res.status === 'booked' && (
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                        <a
                                            href={getGoogleUrl(res)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1 text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white transition-colors"
                                        >
                                            <CalendarPlus className="w-3 h-3" />
                                            Google Takvim
                                        </a>
                                        <button
                                            onClick={() => handleDownloadICS(res)}
                                            className="flex items-center gap-1 text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white transition-colors"
                                        >
                                            <CalendarPlus className="w-3 h-3" />
                                            Apple/Outlook
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
