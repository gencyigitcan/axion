
import { createClient } from '@supabase/supabase-js'
import { sendReservationEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

// Initialize Admin Client (needed to fetch user email, which might be protected)
// Or we just rely on the request having sending user's details.
// Since RPC book_class_session is called from client, we can't hook into it easily for email 
// UNLESS we use Supabase Database Webhooks (advanced) or simply send email from the Client/Server Action AFTER success.
// The safer way for MVP: Client calls an API route "notify-booking" after RPC success.

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, userName, studioName, className, classDate, classTime } = body

        // Validate inputs
        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 })
        }

        // Send Email
        const result = await sendReservationEmail({
            to: email,
            subject: `Rezervasyon Onayı: ${className}`,
            userName,
            studioName,
            className,
            classDate,
            classTime
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Notification error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
