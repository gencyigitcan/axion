import { format } from 'date-fns'

type CalendarEvent = {
    title: string
    description: string
    location: string
    startTime: string // ISO
    endTime: string   // ISO
}

/**
 * Generates a Google Calendar Link
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
    const start = new Date(event.startTime).toISOString().replace(/-|:|\.\d\d\d/g, "")
    const end = new Date(event.endTime).toISOString().replace(/-|:|\.\d\d\d/g, "")

    const url = new URL('https://www.google.com/calendar/render')
    url.searchParams.append('action', 'TEMPLATE')
    url.searchParams.append('text', event.title)
    url.searchParams.append('dates', `${start}/${end}`)
    url.searchParams.append('details', event.description)
    url.searchParams.append('location', event.location)

    return url.toString()
}

/**
 * Generates an .ics file content for Apple/Outlook
 * Note: This usually requires creating a Blob and downloading it in client,
 * or serving a file from API. For simple link, we can use a data URI or just handle Google for now as links.
 * Implementing a simple ics generator.
 */
export function generateICSContent(event: CalendarEvent): string {
    const start = new Date(event.startTime).toISOString().replace(/-|:|\.\d\d\d/g, "")
    const end = new Date(event.endTime).toISOString().replace(/-|:|\.\d\d\d/g, "")
    const now = new Date().toISOString().replace(/-|:|\.\d\d\d/g, "")

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Antigravity//SaaS//EN
BEGIN:VEVENT
UID:${Date.now()}@antigravity.com
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`
}
