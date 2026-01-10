'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from 'recharts'
import { Loader2, TrendingUp, Users, Calendar, DollarSign } from 'lucide-react'
import { format, subMonths, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function ReportsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [revenueData, setRevenueData] = useState<any[]>([])
    const [occupancyData, setOccupancyData] = useState<any[]>([])
    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeMembers: 0,
        totalClasses: 0,
        occupancyRate: 0
    })

    const supabase = createClient()

    useEffect(() => {
        fetchReports()
    }, [])

    const fetchReports = async () => {
        try {
            // 1. Fetch Revenue Data (Package Sales)
            // We join user_credits -> packages to get price
            const { data: credits, error: creditError } = await supabase
                .from('user_credits')
                .select(`
                    created_at,
                    package:packages(price)
                `)
                .order('created_at', { ascending: true })

            if (creditError) throw creditError

            // Aggregate by Month
            const monthlyRevenue = new Map()
            let totalRev = 0

            credits?.forEach((credit: any) => {
                const date = new Date(credit.created_at)
                const monthKey = format(date, 'MMM', { locale: tr })
                const amount = Number(credit.package?.price || 0)

                totalRev += amount
                monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + amount)
            })

            const chartData = Array.from(monthlyRevenue.entries()).map(([name, value]) => ({ name, value }))
            setRevenueData(chartData.length ? chartData : [{ name: 'Ocak', value: 0 }]) // Fallback

            // 2. Fetch Class Occupancy Data
            // We join class_sessions -> class_types
            const { data: sessions, error: sessionError } = await supabase
                .from('class_sessions')
                .select(`
                    bookings:current_bookings_count,
                    capacity,
                    class_type:class_types(name)
                `)

            if (sessionError) throw sessionError

            const typeStats = new Map()
            let totalBooked = 0
            let totalCap = 0

            sessions?.forEach((s: any) => {
                const typeName = s.class_type?.name || 'Genel'
                const booked = s.bookings || 0
                const cap = s.capacity || 10

                totalBooked += booked
                totalCap += cap

                if (!typeStats.has(typeName)) {
                    typeStats.set(typeName, { booked: 0, capacity: 0 })
                }
                const current = typeStats.get(typeName)
                current.booked += booked
                current.capacity += cap
            })

            const occupancyChartData = Array.from(typeStats.entries()).map(([name, stat]) => ({
                name,
                rate: Math.round((stat.booked / stat.capacity) * 100)
            }))

            setOccupancyData(occupancyChartData)

            // 3. General Stats
            const { count: memberCount } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'member')

            setStats({
                totalRevenue: totalRev,
                activeMembers: memberCount || 0,
                totalClasses: sessions?.length || 0,
                occupancyRate: totalCap > 0 ? Math.round((totalBooked / totalCap) * 100) : 0
            })

        } catch (error) {
            console.error('Report fetch error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                    Stüdyo Raporları
                </h1>
                <p className="text-muted-foreground mt-2">
                    Finansal durum ve doluluk analizleri.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass p-6 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="w-4 h-4 text-green-400" /> Toplam Gelir
                    </div>
                    <div className="text-2xl font-bold text-white">
                        ₺{stats.totalRevenue.toLocaleString('tr-TR')}
                    </div>
                </div>
                <div className="glass p-6 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-blue-400" /> Doluluk Oranı
                    </div>
                    <div className="text-2xl font-bold text-white">
                        %{stats.occupancyRate}
                    </div>
                </div>
                <div className="glass p-6 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4 text-purple-400" /> Toplam Üye
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {stats.activeMembers}
                    </div>
                </div>
                <div className="glass p-6 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 text-orange-400" /> Toplam Ders
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {stats.totalClasses}
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Chart */}
                <div className="glass p-6 rounded-xl border border-white/5 min-h-[400px]">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-400" /> Gelir Grafiği
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₺${value}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#4ade80" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Occupancy Chart */}
                <div className="glass p-6 rounded-xl border border-white/5 min-h-[400px]">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-400" /> Branş Bazlı Doluluk (%)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={occupancyData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                                <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                <Tooltip
                                    cursor={{ fill: '#ffffff10' }}
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="rate" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}
