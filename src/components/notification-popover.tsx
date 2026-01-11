'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Check, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

type Notification = {
    id: string
    title: string
    message: string
    created_at: string
    is_read: boolean
    link?: string
}

export function NotificationPopover() {
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)

    const supabase = createClient()

    useEffect(() => {
        fetchNotifications()

        // Realtime Subscription
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload) => {
                    // Check if it belongs to me (RLS doesn't filter realtime on client side perfectly without secure setup, 
                    // but for direct INSERT listening usually we check payload.new.user_id if available,
                    // or just refetch to be safe and let RLS filter the fetch)
                    fetchNotifications()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchNotifications = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)

        if (data) {
            setNotifications(data)
            setUnreadCount(data.filter(n => !n.is_read).length)
        }
    }

    const markAsRead = async (id: string) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id)
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const markAllRead = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
    }

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
            >
                <Bell className="w-5 h-5 text-white/80" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#09090b]" />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-2 w-80 md:w-96 glass-heavy border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                        >
                            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/40">
                                <h3 className="font-semibold text-white">Bildirimler</h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                                    >
                                        Tümünü okundu işaretle
                                    </button>
                                )}
                            </div>

                            <div className="max-h-[400px] overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map(n => (
                                        <div
                                            key={n.id}
                                            className={cn(
                                                "p-4 border-b border-white/5 hover:bg-white/5 transition-colors flex gap-3 relative",
                                                !n.is_read && "bg-primary/5"
                                            )}
                                        >
                                            {!n.is_read && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                            )}
                                            <div className="flex-1 space-y-1">
                                                <p className={cn("text-sm font-medium", n.is_read ? "text-white/70" : "text-white")}>
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    {n.message}
                                                </p>
                                                <p className="text-[10px] text-white/30 pt-1">
                                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: tr })}
                                                </p>
                                            </div>
                                            {!n.is_read && (
                                                <button
                                                    onClick={() => markAsRead(n.id)}
                                                    className="p-1 hover:bg-white/10 rounded-full h-fit text-muted-foreground hover:text-white"
                                                    title="Okundu işaretle"
                                                >
                                                    <Check className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground text-sm">
                                        Bildiriminiz yok.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
