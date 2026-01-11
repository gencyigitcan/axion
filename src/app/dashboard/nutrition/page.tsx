'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Utensils, AlertCircle, CheckCircle, XCircle, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export default function NutritionPage() {
    const [complianceReport, setComplianceReport] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSending, setIsSending] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        fetchCompliance()
    }, [])

    const fetchCompliance = async () => {
        setIsLoading(true)
        // We use the view 'compliance_report' we created earlier
        // It should have columns: user_id, full_name, plan_title, last_tracking_date, days_since_last_track
        const { data, error } = await supabase
            .from('compliance_report')
            .select('*')

        if (data) setComplianceReport(data)
        setIsLoading(false)
    }

    const handleSendReminders = async () => {
        setIsSending(true)
        try {
            const { data, error } = await supabase.rpc('send_daily_nutrition_reminders')

            if (error) throw error

            // @ts-ignore
            toast.success(`${data?.notifications_sent || 0} kişiye hatırlatma gönderildi`)
        } catch (error: any) {
            toast.error('Hatırlatma gönderilirken hata oluştu', { description: error.message })
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Beslenme Takibi
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Öğrencilerin günlük beslenme ve kilo takibi durumu.
                    </p>
                </div>
                <button
                    onClick={handleSendReminders}
                    disabled={isSending}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    <Bell className="w-4 h-4" />
                    {isSending ? 'Gönderiliyor...' : 'Hatırlatma Gönder'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass p-6 rounded-xl border border-white/5">
                    <h3 className="text-sm text-muted-foreground">Aktif Programlar</h3>
                    <p className="text-3xl font-bold text-white mt-2">{complianceReport.length}</p>
                </div>
                <div className="glass p-6 rounded-xl border border-white/5">
                    <h3 className="text-sm text-muted-foreground">Bugün Giriş Yapanlar</h3>
                    <p className="text-3xl font-bold text-green-400 mt-2">
                        {complianceReport.filter(r => r.days_since_last_track === 0).length}
                    </p>
                </div>
                <div className="glass p-6 rounded-xl border border-white/5">
                    <h3 className="text-sm text-muted-foreground">Takibi Aksatanlar</h3>
                    <p className="text-3xl font-bold text-red-400 mt-2">
                        {complianceReport.filter(r => r.days_since_last_track > 0 || r.days_since_last_track === null).length}
                    </p>
                </div>
            </div>

            <div className="glass rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white/5 text-muted-foreground font-medium">
                        <tr>
                            <th className="p-4">Öğrenci</th>
                            <th className="p-4">Program</th>
                            <th className="p-4">Son Giriş</th>
                            <th className="p-4">Durum</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {isLoading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Yükleniyor...</td></tr>
                        ) : complianceReport.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Veri yok.</td></tr>
                        ) : (
                            complianceReport.map((row) => (
                                <tr key={row.user_id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-medium text-white">{row.full_name}</td>
                                    <td className="p-4 text-muted-foreground">{row.plan_title}</td>
                                    <td className="p-4 text-muted-foreground">
                                        {row.last_tracking_date ? new Date(row.last_tracking_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="p-4">
                                        {row.days_since_last_track === 0 ? (
                                            <span className="inline-flex items-center gap-1 text-green-400 bg-green-400/10 px-2 py-1 rounded-full text-xs">
                                                <CheckCircle className="w-3 h-3" /> Düzenli
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-red-400 bg-red-400/10 px-2 py-1 rounded-full text-xs">
                                                <XCircle className="w-3 h-3" /> {row.days_since_last_track || '?'} gün aksattı
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
