export type EmailTemplateParams = {
    to: string
    subject: string
    userName: string
    studioName: string
    // Reservation specific
    className?: string
    classDate?: string
    classTime?: string
    // Invite specific
    inviteLink?: string
}

export const WELCOME_TEMPLATE = (p: EmailTemplateParams) => `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #f9fafb; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <h1 style="color: #111827; font-size: 24px; margin-bottom: 20px;">Hoş Geldin, ${p.userName}!</h1>
    <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
      ${p.studioName} ailesine katıldığın için çok mutluyuz. Artık ders programlarını inceleyebilir ve rezervasyon yapmaya başlayabilirsin.
    </p>
    <div style="margin-top: 30px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Panele Giriş Yap
      </a>
    </div>
  </div>
</body>
</html>
`

export const RESERVATION_CONFIRMED_TEMPLATE = (p: EmailTemplateParams) => `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #f9fafb; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <div style="text-align: center; margin-bottom: 20px;">
       <div style="display: inline-block; width: 50px; height: 50px; background-color: #d1fae5; color: #059669; border-radius: 50%; line-height: 50px; font-size: 24px;">✓</div>
    </div>
    <h1 style="color: #111827; font-size: 24px; text-align: center; margin-bottom: 5px;">Rezervasyon Onaylandı</h1>
    <p style="color: #6b7280; text-align: center; margin-bottom: 30px;">${p.studioName}</p>
    
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
       <table style="width: 100%;">
          <tr>
            <td style="color: #6b7280; padding-bottom: 8px;">Ders:</td>
            <td style="color: #111827; font-weight: bold; text-align: right; padding-bottom: 8px;">${p.className}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding-bottom: 8px;">Tarih:</td>
            <td style="color: #111827; font-weight: bold; text-align: right; padding-bottom: 8px;">${p.classDate}</td>
          </tr>
          <tr>
            <td style="color: #6b7280;">Saat:</td>
            <td style="color: #111827; font-weight: bold; text-align: right;">${p.classTime}</td>
          </tr>
       </table>
    </div>

    <p style="color: #4b5563; font-size: 14px; text-align: center;">
      Dersten en az 10 dakika önce stüdyoda olmanızı rica ederiz. İyi dersler!
    </p>
  </div>
</body>
</html>
`
