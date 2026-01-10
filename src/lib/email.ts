import { Resend } from 'resend';
import { EmailTemplateParams, WELCOME_TEMPLATE, RESERVATION_CONFIRMED_TEMPLATE } from './email-templates';

// NOTE: This file should only be used on the SERVER side (API routes / Server Actions)
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Antigravity <onboarding@resend.dev>'; // Default Resend testing email

export async function sendWelcomeEmail(params: EmailTemplateParams) {
    if (!process.env.RESEND_API_KEY) {
        console.log('[MOCK EMAIL] Welcome Email sent to:', params.to);
        return { success: true, mock: true };
    }

    try {
        const data = await resend.emails.send({
            from: FROM_EMAIL,
            to: params.to,
            subject: params.subject,
            html: WELCOME_TEMPLATE(params),
        });
        return { success: true, data };
    } catch (error) {
        console.error('Email sending failed:', error);
        return { success: false, error };
    }
}

export async function sendReservationEmail(params: EmailTemplateParams) {
    if (!process.env.RESEND_API_KEY) {
        console.log('[MOCK EMAIL] Reservation Email sent to:', params.to, params.className);
        return { success: true, mock: true };
    }

    try {
        const data = await resend.emails.send({
            from: FROM_EMAIL,
            to: params.to,
            subject: params.subject,
            html: RESERVATION_CONFIRMED_TEMPLATE(params),
        });
        return { success: true, data };
    } catch (error) {
        console.error('Email sending failed:', error);
        return { success: false, error };
    }
}
