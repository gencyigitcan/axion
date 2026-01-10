'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, Users, Calendar, Settings, LogOut, Activity, FolderOpen, UserCog, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils' // Note: need to create utils if not exists, but usually simple clsx is fine here.
import { toast } from 'sonner'

const SIDEBAR_ITEMS = [
    { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Calendar', icon: Calendar, href: '/dashboard/calendar' },
    { label: 'Profile', icon: UserCog, href: '/dashboard/profile' },
    { label: 'Members', icon: Users, href: '/dashboard/members' },
    { label: 'Classes', icon: Activity, href: '/dashboard/classes' },
    { label: 'Reports', icon: BarChart3, href: '/dashboard/reports' },
    { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
]

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const checkProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                // Check if user has a profile (belongs to a tenant)
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('tenant_id')
                    .eq('user_id', user.id)
                    .single()

                if (!profile) {
                    // New User -> Go to Onboarding
                    router.replace('/onboarding')
                } else {
                    setIsLoading(false)
                }
            } catch (error) {
                console.error('Profile check failed', error)
                // If error (e.g. 406), likely no profile found, so onboarding
                router.replace('/onboarding')
            }
        }

        checkProfile()
    }, [router, supabase])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        toast.info('Çıkış yapıldı')
        router.refresh()
        router.push('/login')
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-screen w-64 glass-heavy border-r border-white/10 hidden md:flex flex-col z-20">
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
                            <Activity className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-bold tracking-tight text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                            Antigravity
                        </span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {SIDEBAR_ITEMS.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                    isActive
                                        ? "text-white bg-primary/10 border border-primary/20 shadow-[0_0_15px_-5px_var(--color-primary)]"
                                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-0 h-full w-[2px] bg-primary shadow-[0_0_10px_2px_var(--color-primary)]" />
                                )}
                                <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-x-hidden">
                <div className="max-w-7xl mx-auto space-y-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
