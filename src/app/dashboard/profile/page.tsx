'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { Calendar, CreditCard, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
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
            const { data: resData } = await supabase
                .from('reservations')
                .select(`
          id, status,
          class_session:class_sessions(
            start_time,
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
                // .gt('remaining_credits', 0) // Show all or just active? Let's show all
                .order('created_at', { ascending: false })

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
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
