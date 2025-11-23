import { useEffect } from 'react'
import './SuccessScreen.css'

function SuccessScreen({ revealedImage, onClose, formSubmissionId }) {
  const whatsappLink = 'https://bit.ly/3AzMjD0'

  // שמירת קליק על כפתור הווטסאפ (בלי לפגוע בתהליך הקיים)
  const handleWhatsAppClick = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) return

      // קבלת IP ו-user agent
      const clientIP = 'unknown' // ב-client-side לא נוכל לקבל IP אמיתי, אבל נשמור את הנתונים
      const userAgent = navigator.userAgent || 'unknown'

      // שליחה ל-Edge Function או ישירות ל-database דרך Supabase client
      await fetch(`${supabaseUrl}/rest/v1/whatsapp_clicks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          form_submission_id: formSubmissionId || null,
          ip_address: clientIP,
          user_agent: userAgent
        })
      })
    } catch (error) {
      // לא נכשל את התהליך בגלל שגיאת tracking
    }
  }

  return (
    <div className="success-screen">
      <div className="success-content">
        <img src="/logooo.png" alt="מחסני השוק" className="store-logo-top" />
        <img src="/logo.png" alt="Yellow Friday Logo" className="success-logo" />
        
        <h1 className="success-title">
          <span className="title-white">הנה מבצע שנחשף במיוחד עבורך.</span>
          <span className="title-yellow">הצטרפו לקבוצה הסודית וקבלו את המבצעים שעה לפני כולם.</span>
        </h1>
        

        <a 
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-button"
          onClick={handleWhatsAppClick}
        >
        הצטרפו חינם לקבוצת הווטסאפ ⬅
        </a>
        
        <div className="revealed-image-container">
          <img 
            src={revealedImage || '/ex2.png'} 
            alt="מבצע נחשף" 
            className="revealed-image"
          />
        </div>
      </div>
    </div>
  )
}

export default SuccessScreen

