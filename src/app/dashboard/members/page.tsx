'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
    Users, UserPlus, Search,
    Shield, UserCog, User,
    MoreHorizontal, Copy, Check, CreditCard, Loader2, Plus
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type UserProfile = {
    id: string
    user_id: string
    full_name: string | null
    email: string | null
    role: 'member' | 'trainer' | 'admin' | 'owner'
    created_at: string
    tenant_id: string
}

type Package = {
    id: string
    name: string
    price: number
    credit_count: number
    validity_days: number
}

export default function MembersPage() {
    const [members, setMembers] = useState<UserProfile[]>([])
    const [packages, setPackages] = useState<Package[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [inviteLink, setInviteLink] = useState('')
    const [isCopied, setIsCopied] = useState(false)

    // Sale Modal State
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false)
    const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null)
    const [selectedPackageId, setSelectedPackageId] = useState('')
    const [isProcessingSale, setIsProcessingSale] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        fetchData()
        generateInviteLink()
    }, [])

    const fetchData = async () => {
        try {
            // Fetch Members
            const { data: memberData, error: memberError } = await supabase
                .from('user_profiles')
                .select('*')
                .order('role', { ascending: false })
                .order('created_at', { ascending: false })

            if (memberError) throw memberError
            setMembers(memberData || [])

            // Fetch Packages for Sale Modal
            const { data: packageData, error: packageError } = await supabase
                .from('packages')
                .select('*')
                .order('price', { ascending: true })

            if (packageError) throw packageError
            setPackages(packageData || [])

        } catch (error: any) {
            toast.error('Veriler yüklenemedi', { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    const generateInviteLink = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('tenant:tenants(subdomain_slug)')
                .eq('user_id', user.id)
                .single()

            if (profile?.tenant) {
                // @ts-ignore
                const slug = profile.tenant.subdomain_slug
                setInviteLink(`${window.location.origin}/join/${slug}`)
            }
        }
    }

    const copyInvite = () => {
        navigator.clipboard.writeText(inviteLink)
        setIsCopied(true)
        toast.success('Davet Linki Kopyalandı')
        setTimeout(() => setIsCopied(false), 2000)
    }

    const handleRoleUpdate = async (profileId: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ role: newRole })
                .eq('id', profileId)

            if (error) throw error

            setMembers(members.map(m =>
                m.id === profileId ? { ...m, role: newRole as any } : m
            ))

            toast.success('Rol Güncellendi')
        } catch (error: any) {
            toast.error('Hata', { description: error.message })
        }
    }

    const openSaleModal = (member: UserProfile) => {
        setSelectedMember(member)
        setSelectedPackageId('')
        setIsSaleModalOpen(true)
    }

    const handleSale = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedMember || !selectedPackageId) return
        setIsProcessingSale(true)

        try {
            const pkg = packages.find(p => p.id === selectedPackageId)
            if (!pkg) throw new Error('Paket bulunamadı')

            // Calculate Expiry
            const expireDate = new Date()
            expireDate.setDate(expireDate.getDate() + pkg.validity_days)

            const { error } = await supabase
                .from('user_credits')
                .insert({
                    tenant_id: selectedMember.tenant_id,
                    user_id: selectedMember.user_id, // Important: credit is linked to user_id, not profile_id
                    package_id: pkg.id,
                    remaining_credits: pkg.credit_count,
                    expire_date: expireDate.toISOString(),
                    status: 'active'
                })

            if (error) throw error

            toast.success('Paket Tanımlandı', {
                description: `${selectedMember.full_name} hesabına ${pkg.credit_count} hak eklendi.`
            })
            setIsSaleModalOpen(false)

        } catch (error: any) {
            toast.error('İşlem Başarısız', { description: error.message })
        } finally {
            setIsProcessingSale(false)
        }
    }

    const filteredMembers = members.filter(m =>
    (m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="space-y-8">
            {/* Header & Invite Code */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Üyeler & Personel
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Salonunuzdaki tüm kullanıcıları ve yetkilerini yönetin.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden md:flex items-center bg-black/20 border border-white/10 rounded-lg p-1 pr-3 gap-3">
                        <div className="bg-white/5 px-3 py-1.5 rounded text-xs text-muted-foreground font-mono select-all">
                            {inviteLink || '...'}
                        </div>
                        <button onClick={copyInvite} className="text-primary hover:text-white transition-colors">
                            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="İsim veya e-posta ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
            </div>

            {/* List */}
            <div className="glass rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                            <th className="p-4 font-medium text-muted-foreground">Kullanıcı</th>
                            <th className="p-4 font-medium text-muted-foreground">Rol</th>
                            <th className="p-4 font-medium text-muted-foreground">Katılım</th>
                            <th className="p-4 font-medium text-muted-foreground text-right w-[200px]">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {isLoading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-muted-foreground animate-pulse">Yükleniyor...</td></tr>
                        ) : filteredMembers.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Kullanıcı bulunamadı.</td></tr>
                        ) : (
                            filteredMembers.map((member) => (
                                <motion.tr
                                    key={member.id}
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="hover:bg-white/5 transition-colors group"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-xs font-bold text-white/50">
                                                {(member.full_name?.[0] || member.email?.[0] || '?').toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white/90">{member.full_name || 'İsimsiz Üye'}</div>
                                                <div className="text-xs text-muted-foreground">{member.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                            member.role === 'owner' && "bg-purple-500/10 text-purple-400 border-purple-500/20",
                                            member.role === 'admin' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                                            member.role === 'trainer' && "bg-orange-500/10 text-orange-400 border-orange-500/20",
                                            member.role === 'member' && "bg-white/5 text-muted-foreground border-white/10",
                                        )}>
                                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-muted-foreground">
                                        {new Date(member.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {/* Role Select */}
                                            {member.role !== 'owner' && (
                                                <select
                                                    className="bg-black/40 border border-white/10 rounded text-xs p-1 outline-none focus:border-primary/50 text-muted-foreground w-20"
                                                    value={member.role}
                                                    onChange={(e) => handleRoleUpdate(member.id, e.target.value)}
                                                >
                                                    <option value="member">Uye</option>
                                                    <option value="trainer">Egitmen</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            )}

                                            {/* Add Package Button */}
                                            <button
                                                onClick={() => openSaleModal(member)}
                                                className="bg-primary/10 hover:bg-primary/20 text-primary p-1.5 rounded transition-colors"
                                                title="Paket Ekle"
                                            >
                                                <CreditCard className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* SALE MODAL */}
            <AnimatePresence>
                {isSaleModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            onClick={() => setIsSaleModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
                        >
                            <div className="glass-heavy p-6 rounded-2xl border border-white/10 shadow-2xl">
                                <h2 className="text-xl font-bold mb-1 text-white">Paket Tanımla</h2>
                                <p className="text-sm text-muted-foreground mb-6">
                                    <span className="text-primary font-medium">{selectedMember?.full_name}</span> adlı üyeye paket ekliyorsunuz.
                                </p>

                                <form onSubmit={handleSale} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-muted-foreground">Paket Seçin</label>
                                        <select
                                            required
                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm outline-none focus:ring-2 ring-primary/50"
                                            value={selectedPackageId}
                                            onChange={e => setSelectedPackageId(e.target.value)}
                                        >
                                            <option value="">Seçiniz...</option>
                                            {packages.map(pkg => (
                                                <option key={pkg.id} value={pkg.id}>
                                                    {pkg.name} — {pkg.price} ₺ ({pkg.credit_count} Hak)
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pt-4 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsSaleModalOpen(false)}
                                            className="px-4 py-2 hover:bg-white/5 rounded-lg text-sm text-muted-foreground transition-colors"
                                        >
                                            İptal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isProcessingSale || !selectedPackageId}
                                            className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-[0_0_15px_-5px_var(--color-primary)] transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isProcessingSale ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tanımla & Onayla'}
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
