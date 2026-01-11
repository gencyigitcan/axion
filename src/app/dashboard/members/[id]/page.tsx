'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FileText, Upload, Trash2, Calendar, Mail, Phone, CreditCard, AlertCircle, TrendingUp, Save, BarChart2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { toast } from 'sonner'

type Document = {
    id: string
    name: string
    file_url: string
    created_at: string
}

type UserProfile = {
    id: string
    user_id: string
    full_name: string
    email: string // Joined from auth? Supabase difficult to get auth email via simple join directly sometimes, usually we store email in profile or fetch separately. For MVP stored in profile assuming sync.
    role: string
    birth_date?: string
    phone?: string
}

export default function MemberDetailPage() {
    const params = useParams()
    const memberId = params?.id as string // This is user_id (auth id) or profile id? Let's assume passed ID is 'user_id' for simplicity in routing
    const [member, setMember] = useState<UserProfile | null>(null)
    const [documents, setDocuments] = useState<Document[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const supabase = createClient()


    // Measurement State
    const [measurements, setMeasurements] = useState<any[]>([])
    const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState(false)
    const [newMeasurement, setNewMeasurement] = useState({
        weight: '',
        height: '',
        fat_percentage: '',
        muscle_mass: '',
        chest: '',
        waist: '',
        hips: '',
        notes: ''
    })

    useEffect(() => {
        fetchMemberData()
    }, [memberId])

    const fetchMemberData = async () => {
        setIsLoading(true)

        // Fetch Profile
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', memberId)
            .single()

        if (error) {
            toast.error('Üye bulunamadı')
            setIsLoading(false)
            return
        }
        setMember(profile)

        // Fetch Documents
        const { data: docs } = await supabase
            .from('user_documents')
            .select('*')
            .eq('user_id', memberId)
            .order('created_at', { ascending: false })

        if (docs) setDocuments(docs)

        // Fetch Measurements
        const { data: meas } = await supabase
            .from('user_measurements')
            .select('*')
            .eq('user_id', memberId)
            .order('measured_at', { ascending: false })

        if (meas) setMeasurements(meas)

        setIsLoading(false)
    }

    const handleSaveMeasurement = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const { error } = await supabase.from('user_measurements').insert({
                user_id: memberId,
                tenant_id: (await supabase.rpc('get_my_tenant_id_secure')).data,
                ...newMeasurement,
                weight: newMeasurement.weight ? parseFloat(newMeasurement.weight) : null,
                height: newMeasurement.height ? parseFloat(newMeasurement.height) : null,
                fat_percentage: newMeasurement.fat_percentage ? parseFloat(newMeasurement.fat_percentage) : null,
                muscle_mass: newMeasurement.muscle_mass ? parseFloat(newMeasurement.muscle_mass) : null,
                chest: newMeasurement.chest ? parseFloat(newMeasurement.chest) : null,
                waist: newMeasurement.waist ? parseFloat(newMeasurement.waist) : null,
                hips: newMeasurement.hips ? parseFloat(newMeasurement.hips) : null
            })

            if (error) throw error
            toast.success('Ölçüm Kaydedildi')
            setIsMeasurementModalOpen(false)
            fetchMemberData()
            setNewMeasurement({ weight: '', height: '', fat_percentage: '', muscle_mass: '', chest: '', waist: '', hips: '', notes: '' })
        } catch (error: any) {
            toast.error('Hata', { description: error.message })
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        setUploading(true)
        const file = e.target.files[0]

        try {
            // 1. Upload to Storage (Skipping actual binary upload for MVP if bucket not ready, simulating URL)
            // In real app: const { data, error } = await supabase.storage.from('documents').upload(...)
            // For MVP: We just pretend.
            const fakeUrl = `https://example.com/files/${file.name}`

            // 2. Save Metadata
            const { error } = await supabase.from('user_documents').insert({
                user_id: memberId,
                name: file.name,
                file_url: fakeUrl,
                tenant_id: (await supabase.rpc('get_my_tenant_id_secure')).data
            })

            if (error) throw error
            toast.success('Belge yüklendi')
            fetchMemberData()
        } catch (error: any) {
            toast.error('Yükleme başarısız', { description: error.message })
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Belgeyi silmek istiyor musunuz?')) return
        await supabase.from('user_documents').delete().eq('id', id)
        setDocuments(prev => prev.filter(d => d.id !== id))
        toast.success('Belge silindi')
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Üye Detayı</h1>
                <p className="text-muted-foreground">Kişisel bilgiler ve evrak yönetimi.</p>
            </div>

            {isLoading ? (
                <div className="text-center py-20">Yükleniyor...</div>
            ) : member ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Profile Card */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="glass p-6 rounded-2xl border border-white/10 space-y-6">
                            <div className="text-center">
                                <div className="w-24 h-24 mx-auto bg-primary/20 rounded-full flex items-center justify-center text-primary text-3xl font-bold mb-4">
                                    {member.full_name.charAt(0)}
                                </div>
                                <h2 className="text-xl font-bold">{member.full_name}</h2>
                                <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs mt-2">{member.role.toUpperCase()}</span>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <Mail className="w-4 h-4" />
                                    <span className="truncate">{member.email || 'Email gizli'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <Phone className="w-4 h-4" />
                                    <span>{member.phone || '-'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <Calendar className="w-4 h-4" />
                                    <span>{member.birth_date ? format(new Date(member.birth_date), 'd MMMM yyyy', { locale: tr }) : 'Doğum tarihi yok'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Documents & History */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Charts Section */}
                        {measurements.length > 1 && (
                            <div className="glass p-6 rounded-2xl border border-white/10 mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                                    <BarChart2 className="w-5 h-5 text-primary" />
                                    Gelişim Grafiği
                                </h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={[...measurements].reverse()}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                            <XAxis
                                                dataKey="measured_at"
                                                tickFormatter={(date) => new Date(date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                                                stroke="#ffffff50"
                                                fontSize={12}
                                            />
                                            <YAxis stroke="#ffffff50" fontSize={12} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                                            />
                                            <Legend />
                                            <Line type="monotone" dataKey="weight" name="Kilo (kg)" stroke="#8b5cf6" strokeWidth={2} activeDot={{ r: 8 }} />
                                            <Line type="monotone" dataKey="fat_percentage" name="Yağ Oranı (%)" stroke="#ec4899" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                Vücut Ölçümleri
                            </h3>
                            <button
                                onClick={() => setIsMeasurementModalOpen(true)}
                                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm transition-colors flex items-center gap-2"
                            >
                                <TrendingUp className="w-4 h-4" />
                                Yeni Ölçüm
                            </button>
                        </div>

                        {/* Simple Table for MVP */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-center">
                                <thead>
                                    <tr className="border-b border-white/5 text-muted-foreground text-xs uppercase">
                                        <th className="p-3">Tarih</th>
                                        <th className="p-3">Kilo</th>
                                        <th className="p-3">Yağ %</th>
                                        <th className="p-3">Kas</th>
                                        <th className="p-3">Bel</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {measurements.length > 0 ? measurements.map(m => (
                                        <tr key={m.id} className="hover:bg-white/5">
                                            <td className="p-3 text-white/80">{format(new Date(m.measured_at), 'd MMM yyyy')}</td>
                                            <td className="p-3 font-medium">{m.weight} kg</td>
                                            <td className="p-3">{m.fat_percentage}%</td>
                                            <td className="p-3">{m.muscle_mass} kg</td>
                                            <td className="p-3">{m.waist} cm</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="p-6 text-muted-foreground">Ölçüm verisi yok.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Documents Section */}
                    <div className="glass p-6 rounded-2xl border border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Evraklar
                            </h3>
                            <div className="relative">
                                <label className="cursor-pointer px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-2">
                                    <Upload className="w-4 h-4" />
                                    {uploading ? 'Yükleniyor...' : 'Belge Yükle'}
                                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {documents.length > 0 ? documents.map(doc => (
                                <div key={doc.id} className="flex justify-between items-center p-4 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-white">{doc.name}</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), 'd MMM yyyy')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(doc.id)}
                                        className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )) : (
                                <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-white/5 rounded-xl">
                                    Henüz belge yüklenmemiş.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                </div>
    ) : (
        <div className="text-center py-20 text-red-400">Üye verisi yüklenemedi.</div>
    )
}
{/* MEASUREMENT MODAL */ }
{
    isMeasurementModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-heavy w-full max-w-lg p-6 rounded-2xl border border-white/10 shadow-2xl">
                <h2 className="text-xl font-bold mb-6 text-white">Yeni Ölçüm Ekle</h2>
                <form onSubmit={handleSaveMeasurement} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-muted-foreground">Kilo (kg)</label><input type="number" step="0.1" className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm" value={newMeasurement.weight} onChange={e => setNewMeasurement({ ...newMeasurement, weight: e.target.value })} /></div>
                        <div><label className="text-xs text-muted-foreground">Boy (cm)</label><input type="number" step="1" className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm" value={newMeasurement.height} onChange={e => setNewMeasurement({ ...newMeasurement, height: e.target.value })} /></div>
                        <div><label className="text-xs text-muted-foreground">Yağ (%)</label><input type="number" step="0.1" className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm" value={newMeasurement.fat_percentage} onChange={e => setNewMeasurement({ ...newMeasurement, fat_percentage: e.target.value })} /></div>
                        <div><label className="text-xs text-muted-foreground">Kas (kg)</label><input type="number" step="0.1" className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm" value={newMeasurement.muscle_mass} onChange={e => setNewMeasurement({ ...newMeasurement, muscle_mass: e.target.value })} /></div>
                        <div><label className="text-xs text-muted-foreground">Bel (cm)</label><input type="number" step="0.5" className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm" value={newMeasurement.waist} onChange={e => setNewMeasurement({ ...newMeasurement, waist: e.target.value })} /></div>
                        <div><label className="text-xs text-muted-foreground">Kalça (cm)</label><input type="number" step="0.5" className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm" value={newMeasurement.hips} onChange={e => setNewMeasurement({ ...newMeasurement, hips: e.target.value })} /></div>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground">Notlar</label>
                        <textarea className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm" rows={2} value={newMeasurement.notes} onChange={e => setNewMeasurement({ ...newMeasurement, notes: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsMeasurementModalOpen(false)} className="px-4 py-2 hover:bg-white/5 rounded-lg text-sm text-muted-foreground">İptal</button>
                        <button type="submit" className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-sm font-medium">Kaydet</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
        </div >
    )
}
