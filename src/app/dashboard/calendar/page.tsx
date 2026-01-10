'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { startOfWeek, addDays, format, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Users, User, Check, Loader2, Clock, CalendarDays, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Types
type ClassSession = {
    id: string
    start_time: string
    end_time: string
    capacity: number
    current_bookings_count: number
    class_type: { id: string, name: string } | null
    trainer: { full_name: string } | null
}

type ClassType = { id: string, name: string }
type Trainer = { user_id: string, full_name: string }
type UserRole = 'member' | 'trainer' | 'admin' | 'owner'

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [sessions, setSessions] = useState<ClassSession[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [userRole, setUserRole] = useState<UserRole>('member')
    const [userId, setUserId] = useState<string>('')
    const [userBookings, setUserBookings] = useState<string[]>([]) // Session IDs
    const [userWaitlist, setUserWaitlist] = useState<string[]>([]) // Session IDs
    const [isBooking, setIsBooking] = useState(false)

    const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [classTypes, setClassTypes] = useState<ClassType[]>([])
    const [trainers, setTrainers] = useState<Trainer[]>([])

    // Form State
    const [formData, setFormData] = useState({
        class_type_id: '',
        trainer_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '10:00',
        duration: '60',
        capacity: '10'
    })

    const supabase = createClient()
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))

    useEffect(() => {
        checkUser()
    }, [])

    useEffect(() => {
        fetchSessions()
    }, [currentDate])

    // Fetch Metadata only when opening modal
    useEffect(() => {
        if (isModalOpen) fetchMetadata()
    }, [isModalOpen])

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            setUserId(user.id)
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('user_id', user.id)
                .single()
            if (profile) setUserRole(profile.role)
        }
    }

    const fetchSessions = async () => {
        setIsLoading(true)
        const start = weekDays[0].toISOString()
        const end = addDays(weekDays[6], 1).toISOString()

        // 1. Fetch Sessions
        const { data: sessionsData, error } = await supabase
            .from('class_sessions')
            .select(`
        id, start_time, end_time, capacity, current_bookings_count,
        class_type:class_types(id, name),
        trainer:user_profiles(full_name)
      `)
            .gte('start_time', start)
            .lt('start_time', end)

        if (error) {
            console.error(error)
            toast.error('Takvim yüklenemedi', { description: error.message || error.details || 'Bilinmeyen hata' })
        } else {
            setSessions(sessionsData as any || [])
        }

        // 2. Fetch User Bookings & Waitlist
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: bookings } = await supabase
                .from('reservations')
                .select('session_id')
                .eq('user_id', user.id)
                .in('status', ['booked', 'checked_in'])

            if (bookings) {
                setUserBookings(bookings.map(b => b.session_id))
            }

            const { data: waitlist } = await supabase
                .from('waitlist')
                .select('session_id')
                .eq('user_id', user.id)

            if (waitlist) {
                setUserWaitlist(waitlist.map(w => w.session_id))
            }
        }

        setIsLoading(false)
    }

    const fetchMetadata = async () => {
        const [ctRes, trRes] = await Promise.all([
            supabase.from('class_types').select('id, name'),
            supabase.from('user_profiles').select('user_id, full_name').in('role', ['trainer', 'admin', 'owner'])
        ])

        if (ctRes.data) setClassTypes(ctRes.data)
        if (trRes.data) setTrainers(trRes.data)
    }

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No Auth')

            // Get Tenant ID
            const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('user_id', user.id).single()
            if (!profile) throw new Error('No Profile')

            // Calc Times
            const startDateTime = new Date(`${formData.date}T${formData.time}`)
            const endDateTime = new Date(startDateTime.getTime() + parseInt(formData.duration) * 60000)

            const { error } = await supabase.from('class_sessions').insert({
                tenant_id: profile.tenant_id,
                class_type_id: formData.class_type_id,
                trainer_id: formData.trainer_id || user.id, // Default to self if empty
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                capacity: parseInt(formData.capacity)
            })

            if (error) throw error

            toast.success('Ders Planlandı')
            setIsModalOpen(false)
            fetchSessions() // Refresh
        } catch (error: any) {
            toast.error('Hata oluştu', { description: error.message })
        }
    }

    const handleBookSession = async (session: ClassSession) => {
        if (isBooking) return
        setIsBooking(true)

        try {
            // 1. Find Valid Credit
            // We need to find a credit where remaining_credits > 0 AND check package allowed_class_types
            // This logic is complex to do purely in client with simple query, 
            // but let's try to fetch active credits and filter in JS for now.

            // Fetch user's active credits
            const { data: credits, error: creditError } = await supabase
                .from('user_credits')
                .select(`
                id, remaining_credits, 
                package:packages(allowed_class_type_ids)
            `)
                .eq('user_id', userId)
                .eq('status', 'active')
                .gt('remaining_credits', 0)

            if (creditError) throw creditError

            // Find applicable credit
            const validCredit = credits?.find(c =>
                // @ts-ignore - Supabase types might be tricky here, assume allowed_class_type_ids is array
                c.package?.allowed_class_type_ids?.includes(session.class_type?.id)
            )

            if (!validCredit) {
                toast.error('Yetersiz Bakiye', {
                    description: 'Bu ders için geçerli bir paketiniz yok. Lütfen paket satın alın.'
                })
                setIsBooking(false)
                return
            }

            // 2. Call RPC
            const { data, error } = await supabase
                .rpc('book_class_session', {
                    p_session_id: session.id,
                    p_user_id: userId,
                    p_credit_id: validCredit.id
                })

            if (error) {
                // Parse custom error from PG
                if (error.message.includes('insufficient capacity')) throw new Error('Kontenjan Dolu')
                if (error.message.includes('already booked')) throw new Error('Zaten rezervasyonunuz var')
                throw error
            }

            toast.success('Rezervasyon Onaylandı!', { description: `${session.class_type?.name} için yeriniz ayrıldı.` })

            // Trigger Email Notification (Non-blocking)
            fetch('/api/notify/booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'test@example.com', // TODO: Get actual user email
                    userName: 'Değerli Üyemiz',
                    studioName: 'Antigravity Studio',
                    className: session.class_type?.name,
                    classDate: format(new Date(session.start_time), 'd MMMM yyyy'),
                    classTime: format(new Date(session.start_time), 'HH:mm')
                })
            }).catch(err => console.error('Email trigger failed', err))

            fetchSessions() // Refresh UI

        } catch (error: any) {
            toast.error('Rezervasyon Başarısız', { description: error.message })
        } finally {
            setIsBooking(false)
        }
    }

    const handleCancelSession = async (session: ClassSession) => {
        if (!confirm(`${session.class_type?.name} rezervasyonunuzu iptal etmek istediğinize emin misiniz?`)) return
        setIsBooking(true)
        try {
            // Find reservation ID (Need to query it first or we could have stored it in userBookings if it was an object)
            // For MVP, since we only stored sessionIDs in 'userBookings', we query the reservation ID now.
            const { data: resData, error: resError } = await supabase
                .from('reservations')
                .select('id')
                .eq('session_id', session.id)
                .eq('user_id', userId)
                .eq('status', 'booked')
                .single()

            if (resError || !resData) throw new Error('Rezervasyon bulunamadı')

            const { data, error } = await supabase.rpc('cancel_reservation', {
                p_reservation_id: resData.id
            })

            if (error) throw error
            // @ts-ignore
            if (data && !data.success) throw new Error(data.error)

            // @ts-ignore
            toast.success(data.message)
            fetchSessions() // Refresh UI (Bookings count, etc.)
            checkUser() // Refresh credits (if refunded)
            setSelectedSession(null)
        } catch (error: any) {
            toast.error('İptal Başarısız', { description: error.message })
        } finally {
            setIsBooking(false)
        }
    }

    const handleJoinWaitlist = async (session: ClassSession) => {
        setIsBooking(true)
        try {
            const { data, error } = await supabase.rpc('join_waitlist', {
                p_session_id: session.id,
                p_user_id: userId
            })

            if (error) throw error
            // @ts-ignore
            if (data && !data.success) throw new Error(data.error)

            // @ts-ignore
            toast.success(data.message)
            fetchSessions()
            setSelectedSession(null)
        } catch (error: any) {
            toast.error('İşlem Başarısız', { description: error.message })
        } finally {
            setIsBooking(false)
        }
    }

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Haftalık Program
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                        <button onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="p-1 hover:text-white"><ChevronLeft className="w-5 h-5" /></button>
                        <span className="font-mono text-white/90">{format(weekStart, 'd MMM')} - {format(weekDays[6], 'd MMM yyyy')}</span>
                        <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="p-1 hover:text-white"><ChevronRight className="w-5 h-5" /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="ml-2 text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20">Bugün</button>
                    </div>
                </div>

                {/* Only Admin/Trainer can schedule */}
                {['admin', 'owner', 'trainer'].includes(userRole) && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-[0_0_15px_-5px_var(--color-primary)] transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Ders Planla
                    </button>
                )}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 gap-px bg-white/5 border border-white/10 rounded-2xl overflow-hidden glass">
                {weekDays.map((day, i) => {
                    const isToday = isSameDay(day, new Date())
                    const daySessions = sessions.filter(s => isSameDay(new Date(s.start_time), day))

                    return (
                        <div key={i} className="flex flex-col h-full bg-background/50 hover:bg-white/5 transition-colors group">
                            {/* Day Header */}
                            <div className={cn("p-3 text-center border-b border-white/5", isToday && "bg-primary/10")}>
                                <div className={cn("text-xs uppercase font-semibold mb-1", isToday ? "text-primary" : "text-muted-foreground")}>
                                    {format(day, 'EEEE')}
                                </div>
                                <div className={cn("text-2xl font-bold", isToday ? "text-primary" : "text-white/80")}>
                                    {format(day, 'd')}
                                </div>
                            </div>

                            {/* Sessions List */}
                            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                                {daySessions.map(session => {
                                    const isBooked = userBookings.includes(session.id)
                                    const isFull = session.current_bookings_count >= session.capacity && !isBooked

                                    return (
                                        <motion.div
                                            key={session.id}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn(
                                                "p-3 rounded-lg border transition-all cursor-pointer group/card relative overflow-hidden flex flex-col gap-2",
                                                isBooked ? "bg-primary/20 border-primary/40" : "bg-white/5 border-white/5 hover:border-primary/30"
                                            )}
                                            onClick={() => {
                                                // Admin/Trainer opens session logic? Or maybe member opens details? 
                                                // Let's open the Detail Modal for everyone
                                                setSelectedSession(session)
                                            }}
                                        >
                                            <div className={cn("absolute top-0 left-0 w-1 h-full", isBooked ? "bg-primary" : "bg-primary/50")} />

                                            <div className="flex justify-between items-start">
                                                <span className={cn("text-xs font-mono font-bold", isBooked ? "text-white" : "text-primary")}>
                                                    {format(new Date(session.start_time), 'HH:mm')}
                                                </span>
                                                {/* Capacity Badge */}
                                                <div className={cn("flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded", isFull ? "bg-red-500/20 text-red-200" : "bg-black/40 text-muted-foreground")}>
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

                                            {/* Booking Status Indicator */}
                                            {isBooked && (
                                                <div className="flex items-center gap-1 text-xs text-green-400 font-medium mt-1">
                                                    <Check className="w-3 h-3" />
                                                    <span>Rezervasyon Yaptın</span>
                                                </div>
                                            )}
                                            {isFull && !isBooked && (
                                                <div className="text-xs text-red-400 mt-1">Kontenjan Dolu</div>
                                            )}
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* SESSION DETAIL & BOOKING MODAL */}
            <AnimatePresence>
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
                            <div className="glass-heavy p-6 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
                                {userBookings.includes(selectedSession.id) && (
                                    <div className="absolute top-0 right-0 p-4">
                                        <div className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20 flex items-center gap-1">
                                            <Check className="w-3 h-3" /> Kayıtlısın
                                        </div>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-white mb-2">{selectedSession.class_type?.name}</h2>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-4 h-4 text-primary" />
                                            <span className="text-white/80">{selectedSession.trainer?.full_name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-primary" />
                                            <span className="text-white/80">
                                                {format(new Date(selectedSession.start_time), 'HH:mm')} - {format(new Date(selectedSession.end_time), 'HH:mm')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Tarih</span>
                                            <span className="text-white font-medium">{format(new Date(selectedSession.start_time), 'd MMMM yyyy, EEEE')}</span>
                                        </div>
                                        <div className="w-full h-px bg-white/5" />
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Kontenjan</span>
                                            <span className="text-white font-medium flex items-center gap-2">
                                                {selectedSession.current_bookings_count} / {selectedSession.capacity}
                                                <span className="text-xs text-muted-foreground font-normal">(Kişi)</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Area */}
                                    {userRole === 'member' ? (
                                        userBookings.includes(selectedSession.id) ? (
                                            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-green-200 text-sm flex items-start gap-3">
                                                <Check className="w-5 h-5 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-semibold">Rezerve Edildi</p>
                                                    <p className="opacity-80 text-xs mt-1">Bu derste yeriniz ayrıldı. İptal etmek için stüdyo ile iletişime geçin.</p>
                                                </div>
                                            </div>
                                        ) : selectedSession.current_bookings_count >= selectedSession.capacity ? (
                                            <div className="space-y-4">
                                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-200 text-sm flex items-start gap-3">
                                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-semibold">Kontenjan Dolu</p>
                                                        <p className="opacity-80 text-xs mt-1">Bu ders şu an tam kapasite doludur. Yedek listeye kaydolarak yer açıldığında haberdar olabilirsiniz.</p>
                                                    </div>
                                                </div>

                                                {userWaitlist.includes(selectedSession.id) ? (
                                                    <div className="w-full py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-200 font-medium flex items-center justify-center gap-2">
                                                        <Clock className="w-4 h-4" /> Yedek Listedesiniz
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleJoinWaitlist(selectedSession)}
                                                        className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
                                                        disabled={isBooking}
                                                    >
                                                        {isBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yedek Listeye Katıl'}
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    handleBookSession(selectedSession)
                                                    setSelectedSession(null)
                                                }}
                                                disabled={isBooking}
                                                className="w-full py-4 bg-primary hover:bg-primary/90 rounded-xl text-white font-bold text-lg shadow-[0_0_20px_-5px_var(--color-primary)] transition-all flex items-center justify-center gap-2"
                                            >
                                                {isBooking ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Rezervasyonu Tamamla'}
                                            </button>
                                        )
                                    ) : (
                                        <div className="p-4 rounded-xl bg-white/5 text-center text-sm text-muted-foreground">
                                            Yönetici/Eğitmen modu: Bu dersi düzenlemek için panel kullanın.
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setSelectedSession(null)}
                                    className="absolute top-4 left-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* CREATE SESSION MODAL (Admins Only) */}
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
                                <h2 className="text-xl font-bold mb-6 text-white">Yeni Ders Planla</h2>

                                <form onSubmit={handleCreateSession} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-muted-foreground">Ders Tipi</label>
                                        <select
                                            required
                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-primary/50"
                                            value={formData.class_type_id}
                                            onChange={e => setFormData({ ...formData, class_type_id: e.target.value })}
                                        >
                                            <option value="">Seçiniz...</option>
                                            {classTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-muted-foreground">Eğitmen</label>
                                        <select
                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-primary/50"
                                            value={formData.trainer_id}
                                            onChange={e => setFormData({ ...formData, trainer_id: e.target.value })}
                                        >
                                            <option value="">Ben (Otomatik)</option>
                                            {trainers.map(tr => <option key={tr.user_id} value={tr.user_id}>{tr.full_name}</option>)}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs text-muted-foreground">Tarih</label>
                                            <input
                                                type="date"
                                                required
                                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-primary/50"
                                                value={formData.date}
                                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-muted-foreground">Saat</label>
                                            <input
                                                type="time"
                                                required
                                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-primary/50"
                                                value={formData.time}
                                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs text-muted-foreground">Süre (dk)</label>
                                            <input
                                                type="number"
                                                required
                                                min="15"
                                                step="15"
                                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-primary/50"
                                                value={formData.duration}
                                                onChange={e => setFormData({ ...formData, duration: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-muted-foreground">Kontenjan</label>
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-primary/50"
                                                value={formData.capacity}
                                                onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-4 py-2 hover:bg-white/5 rounded-lg text-sm text-muted-foreground transition-colors"
                                        >
                                            İptal
                                        </button>
                                        <button
                                            type="submit"
                                            className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-[0_0_15px_-5px_var(--color-primary)] transition-all"
                                        >
                                            Planla
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
