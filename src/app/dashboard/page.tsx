'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Calendar, TrendingUp, Activity, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'

export default function DashboardPage() {
    const [stats, setStats] = useState({
        totalMembers: 0,
        activeClasses: 0,
        totalBookings: 0,
        revenue: 0
    })
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get Tenant ID
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('tenant_id')
                .eq('user_id', user.id)
                .single()

            const tenantId = profile?.tenant_id
            if (!tenantId) return

            // 1. Total Members
            const { count: memberCount } = await supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)

            // 2. Classes This Week (Active)
            const today = new Date().toISOString()
            const { count: sessionCount } = await supabase
                .from('class_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .gte('start_time', today)

            // 3. Total Bookings (All time)
            const { count: bookingCount } = await supabase
                .from('reservations')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)

            // 4. Revenue (Simple sum of sold packages - approximated by credits)
            // This is harder without a "sales" table, we used user_credits directly.
            // We'll calculate it by joining user_credits -> packages. 
            // This might lag if RLS doesn't allow reading other people's credits for non-admins.
            // Assuming Admin/Owner is viewing this dashboard.
            // If "Member", they see THEIR stats.

            setStats({
                totalMembers: memberCount || 0,
                activeClasses: sessionCount || 0,
                totalBookings: bookingCount || 0,
                revenue: 0 // Placeholder
            })

        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const statCards = [
        { label: 'Toplam Üye', value: stats.totalMembers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: 'Gelecek Dersler', value: stats.activeClasses, icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        { label: 'Toplam Rezervasyon', value: stats.totalBookings, icon: Activity, color: 'text-green-400', bg: 'bg-green-400/10' },
    ]

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                    Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">Stüdyonuzun anlık durum özeti.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass p-6 rounded-xl border border-white/10 hover:border-primary/30 transition-colors group relative overflow-hidden"
                    >
                        <div className={`absolute top-4 right-4 p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                            <stat.icon className="w-6 h-6" />
                        </div>

                        <h3 className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</h3>
                        {loading ? (
                            <div className="h-9 w-24 bg-white/10 rounded animate-pulse" />
                        ) : (
                            <p className="text-4xl font-bold text-white tracking-tight">
                                {stat.value}
                            </p>
                        )}

                        {/* Sparkline decoration */}
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity / Quick Actions Placeholder */}
                <div className="glass p-6 rounded-xl border border-white/10 min-h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                    <span className="opacity-50">Aktivite Akışı (Yakında)</span>
                </div>
                <div className="glass p-6 rounded-xl border border-white/10 min-h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                    <span className="opacity-50">Gelir Grafiği (Yakında)</span>
                </div>
            </div>
        </div>
    )
}
