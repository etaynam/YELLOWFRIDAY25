import { useState, useRef, useImperativeHandle, forwardRef } from 'react'
import { FiUser, FiMail, FiPhone, FiMapPin, FiBell, FiLoader } from 'react-icons/fi'
import './SecretDealsStrip.css'

const SecretDealsStrip = forwardRef((props, ref) => {
  const { onSuccess } = props
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [city, setCity] = useState('')
  const [cityError, setCityError] = useState('')
  const [firstNameError, setFirstNameError] = useState('')
  const [lastNameError, setLastNameError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [honeypot, setHoneypot] = useState('') // Honeypot field - אם מולא, זה בוט
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [formStep, setFormStep] = useState(1) // 1 = שם, 2 = טלפון/אימייל, 3 = עיר, 4 = הסכמות
  const totalSteps = 4
  const [isFromProduct, setIsFromProduct] = useState(false) // האם הטופס נפתח מתמונה
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })
  const cityInputRef = useRef(null)
  const firstNameRef = useRef(null)
  const lastNameRef = useRef(null)
  const emailRef = useRef(null)
  const phoneRef = useRef(null)

  const togglePopup = () => {
    if (isOpen) {
      setIsClosing(true)
      setTimeout(() => {
        setIsOpen(false)
        setIsClosing(false)
        // ניקוי כל ה-states כשסוגרים
        setCity('')
        setCityError('')
        setAgreeTerms(false)
        setAgreePrivacy(false)
        setFormStep(1)
        setIsFromProduct(false)
        setFirstNameError('')
        setLastNameError('')
        setPhoneError('')
        setIsSubmitting(false)
        setSubmitError('')
        setHoneypot('')
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: ''
        })
      }, 300)
    } else {
      setIsOpen(true)
      setFormStep(1)
      setIsFromProduct(false) // מהפס הצהוב
    }
  }

  useImperativeHandle(ref, () => ({
    openForm: () => {
      if (!isOpen) {
        setIsOpen(true)
        setFormStep(1)
        setIsFromProduct(true) // מתמונה
      }
    }
  }))


  const handleCityChange = (e) => {
    const value = e.target.value
    setCity(value)
    // מנקים שגיאה כשמתחילים להקליד מחדש
    if (cityError) {
      setCityError('')
    }
  }

  // פונקציות validation
  const isValidHebrewName = (name) => {
    // בדיקה שכל התווים הם אותיות עבריות, רווחים או מקפים
    const hebrewRegex = /^[\u0590-\u05FF\s\-']+$/
    return hebrewRegex.test(name.trim()) && name.trim().length >= 2
  }

  const isValidPhone = (phone) => {
    // הסרת כל התווים שאינם מספרים
    const digitsOnly = phone.replace(/\D/g, '')
    
    // בדיקה שזה בדיוק 9 או 10 ספרות
    if (digitsOnly.length !== 9 && digitsOnly.length !== 10) {
      return false
    }
    
    // אם יש 10 ספרות, צריך להתחיל ב-0
    if (digitsOnly.length === 10) {
      if (digitsOnly[0] !== '0') {
        return false
      }
      // בדיקה שזה מספר נייד (05X) או קווי (0X)
      const secondDigit = digitsOnly[1]
      // מספר נייד: 050, 051, 052, 053, 054, 055, 056, 057, 058, 059
      if (secondDigit === '5') {
        // מספר נייד - הספרה השלישית צריכה להיות 0-9
        const thirdDigit = digitsOnly[2]
        if (thirdDigit < '0' || thirdDigit > '9') {
          return false
        }
        // מספר נייד צריך להיות 10 ספרות כולל ה-0
        return true
      }
      // מספר קווי: 02, 03, 04, 08, 09
      if (['2', '3', '4', '8', '9'].includes(secondDigit)) {
        return true
      }
      return false
    }
    
    // אם יש 9 ספרות, צריך להתחיל ב-5 (מספר נייד ללא 0)
    // לא יכול להתחיל ב-0 אם יש רק 9 ספרות
    if (digitsOnly.length === 9) {
      if (digitsOnly[0] === '0') {
        // אם מתחיל ב-0 אבל יש רק 9 ספרות, זה לא תקני
        return false
      }
      // צריך להתחיל ב-5 (מספר נייד ללא 0)
      if (digitsOnly[0] !== '5') {
        return false
      }
      // הספרה השנייה צריכה להיות 0-9
      const secondDigit = digitsOnly[1]
      return secondDigit >= '0' && secondDigit <= '9'
    }
    
    return false
  }

  const handleNextStep = (e) => {
    e.preventDefault()
    
    // בדיקה לפי שלב
    if (formStep === 1) {
      // שלב 1: שם פרטי ושם משפחה
      setFirstNameError('')
      setLastNameError('')
      
      if (!formData.firstName.trim()) {
        setFirstNameError('אנא הזן שם פרטי')
        firstNameRef.current?.focus()
        return
      }
      
      if (!isValidHebrewName(formData.firstName)) {
        setFirstNameError('אנא הזן שם פרטי בעברית תקנית')
        firstNameRef.current?.focus()
        return
      }
      
      if (!formData.lastName.trim()) {
        setLastNameError('אנא הזן שם משפחה')
        lastNameRef.current?.focus()
        return
      }
      
      if (!isValidHebrewName(formData.lastName)) {
        setLastNameError('אנא הזן שם משפחה בעברית תקנית')
        lastNameRef.current?.focus()
        return
      }
      
      setFormStep(2)
    } else if (formStep === 2) {
      // שלב 2: טלפון ודואר אלקטרוני (אימייל לא חובה)
      setPhoneError('')
      
      if (!formData.phone.trim()) {
        setPhoneError('אנא הזן מספר טלפון')
        phoneRef.current?.focus()
        return
      }
      
      if (!isValidPhone(formData.phone)) {
        setPhoneError('אנא הזן מספר טלפון תקני (9-10 ספרות)')
        phoneRef.current?.focus()
        return
      }
      
      setFormStep(3)
    } else if (formStep === 3) {
      // שלב 3: עיר מגורים
      if (!city.trim()) {
        setCityError('אנא הזן עיר מגורים')
        cityInputRef.current?.focus()
        return
      }
      
      if (!isValidHebrewName(city)) {
        setCityError('אנא הזן עיר בעברית תקנית')
        cityInputRef.current?.focus()
        return
      }
      
      setFormStep(4)
    }
  }

  const handleBackStep = () => {
    if (formStep > 1) {
      setFormStep(formStep - 1)
    }
  }

  const getProgressPercentage = () => {
    return (formStep / totalSteps) * 100
  }

  const getButtonText = () => {
    if (formStep === 1) return 'המשך'
    if (formStep === 2) return 'המשך'
    if (formStep === 3) return 'המשך, כמעט סיימנו'
    return 'קבל חשיפה עכשיו'
  }

  // Rate limiting - בדיקה כמה פעמים נשלח
  const checkRateLimit = () => {
    const now = Date.now()
    const submissions = JSON.parse(localStorage.getItem('formSubmissions') || '[]')
    const recentSubmissions = submissions.filter(time => now - time < 60000) // 1 דקה
    
    if (recentSubmissions.length >= 3) {
      return false // יותר מדי שליחות
    }
    
    // שמור את הזמן הנוכחי
    submissions.push(now)
    // שמור רק את 10 האחרונות
    const recent = submissions.slice(-10)
    localStorage.setItem('formSubmissions', JSON.stringify(recent))
    
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // בדיקת honeypot - אם השדה מולא, זה בוט
    if (honeypot) {
      console.log('Bot detected via honeypot')
      return // לא שולחים כלום, רק עוצרים
    }
    
    // בדיקת rate limiting
    if (!checkRateLimit()) {
      setSubmitError('יותר מדי שליחות. אנא נסה שוב בעוד כמה דקות.')
      return
    }
    
    // בדוק אם שני הצ'קבוקסים מסומנים
    if (!agreeTerms || !agreePrivacy) {
      alert('אנא אשר את כל ההסכמות הנדרשות')
      return
    }
    
    setIsSubmitting(true)
    setSubmitError('')
    
    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || '', // אימייל אופציונלי
        city: city.trim(),
        agreeTerms: agreeTerms,
        agreePrivacy: agreePrivacy,
        isFromProduct: isFromProduct,
        honeypot: honeypot, // נשלח לבדיקה בצד השרת
        timestamp: new Date().toISOString()
      }
      
      // שליחה דרך Supabase Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey) {
        setSubmitError('שגיאה בהגדרת המערכת. אנא פנה לתמיכה.')
        setIsSubmitting(false)
        return
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/submit-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', response.status, errorText)
        throw new Error(`שגיאה בשליחת הטופס (${response.status}): ${errorText}`)
      }
      
      const responseData = await response.json()
      const submissionId = responseData.submissionId || null
      
      // הצלחה - סגור את הטופס והצג מסך הצלחה
      togglePopup()
      // קרא ל-onSuccess עם נתיב התמונה ו-ID הרישום
      if (onSuccess) {
        const imagePath = '/ex2.png'
        onSuccess(imagePath, submissionId)
      }
      
    } catch (error) {
      console.error('Error submitting form:', error)
      setSubmitError('אירעה שגיאה בשליחת הטופס. אנא נסה שוב.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="secret-deals-strip" onClick={togglePopup}>
        <span className="strip-text">קבלו את המבצעים בפרסום מוקדם</span>
      </div>
      
      {(isOpen || isClosing) && (
        <div className={`popup-overlay ${isClosing ? 'closing' : ''}`} onClick={togglePopup}>
          <div className={`popup-content ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={togglePopup}>×</button>
            {formStep === 1 && isFromProduct ? (
              <div className="popup-title-container">
                <h2 className="popup-title">
                  השאירו פרטים ← <span className="highlight-text">וקבלו חשיפה מיידית של מבצע אחד בלבד</span>
                </h2>
                <h3 className="popup-subtitle">מתוך רשימת המבצעים הענקית של שישי הקרוב</h3>
              </div>
            ) : (
              <h2 className="popup-title">
                {formStep === 1 
                  ? 'הירשמו עכשיו וקבלו את המבצעים בפרסום מוקדם'
                  : formStep === 4
                  ? 'רגע לפני שממשיכים ההסכמה שלך חשובה לנו'
                  : 'הירשמו עכשיו וקבלו את המבצעים בפרסום מוקדם'
                }
              </h2>
            )}
            
            {/* Progress Bar */}
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
              <div className="progress-text">
                שלב {formStep} מתוך {totalSteps}
              </div>
            </div>
            
            <div className={`form-steps-container step-${formStep}`}>
              {formStep === 1 ? (
                <form className="popup-form" onSubmit={handleNextStep}>
                  <div className="form-row">
                    <div className="input-wrapper">
                      <FiUser className="input-icon" />
                      <input 
                        ref={firstNameRef}
                        type="text" 
                        placeholder="שם פרטי" 
                        className={`form-input ${firstNameError ? 'input-error' : ''}`}
                        value={formData.firstName}
                        onChange={(e) => {
                          setFormData({...formData, firstName: e.target.value})
                          if (firstNameError) setFirstNameError('')
                        }}
                        required
                      />
                      {firstNameError && (
                        <div className="field-error-message">{firstNameError}</div>
                      )}
                    </div>
                    <div className="input-wrapper">
                      <FiUser className="input-icon" />
                      <input 
                        ref={lastNameRef}
                        type="text" 
                        placeholder="שם משפחה" 
                        className={`form-input ${lastNameError ? 'input-error' : ''}`}
                        value={formData.lastName}
                        onChange={(e) => {
                          setFormData({...formData, lastName: e.target.value})
                          if (lastNameError) setLastNameError('')
                        }}
                        required
                      />
                      {lastNameError && (
                        <div className="field-error-message">{lastNameError}</div>
                      )}
                    </div>
                  </div>
                  
                  <button type="submit" className="submit-button">
                    {getButtonText()}
                  </button>
                </form>
              ) : formStep === 2 ? (
                <form className="popup-form" onSubmit={handleNextStep}>
                  <div className="input-wrapper">
                    <FiPhone className="input-icon" />
                    <input 
                      ref={phoneRef}
                      type="tel" 
                      placeholder="טלפון" 
                      className={`form-input ${phoneError ? 'input-error' : ''}`}
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({...formData, phone: e.target.value})
                        if (phoneError) setPhoneError('')
                      }}
                      required
                    />
                    {phoneError && (
                      <div className="field-error-message">{phoneError}</div>
                    )}
                  </div>
                  <div className="input-wrapper">
                    <FiMail className="input-icon" />
                    <input 
                      ref={emailRef}
                      type="email" 
                      placeholder="דואר אלקטרוני (אופציונלי)" 
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-buttons-vertical">
                    <button type="submit" className="submit-button">
                      {getButtonText()}
                    </button>
                    <button type="button" className="back-button" onClick={handleBackStep}>
                      חזרה
                    </button>
                  </div>
                </form>
              ) : formStep === 3 ? (
                <form className="popup-form" onSubmit={handleNextStep}>
                  <div className="input-wrapper">
                    <FiMapPin className="input-icon" />
                    <input 
                      ref={cityInputRef}
                      type="text" 
                      placeholder="עיר מגורים" 
                      className={`form-input ${cityError ? 'input-error' : ''}`}
                      value={city}
                      onChange={handleCityChange}
                      required
                    />
                    {cityError && (
                      <div className="field-error-message">{cityError}</div>
                    )}
                  </div>
                  
                  <div className="form-buttons-vertical">
                    <button type="submit" className="submit-button">
                      {getButtonText()}
                    </button>
                    <button type="button" className="back-button" onClick={handleBackStep}>
                      חזרה
                    </button>
                  </div>
                </form>
              ) : (
                <form className="popup-form" onSubmit={handleSubmit}>
                  {/* Honeypot field - נסתר מהמשתמש, רק בוטים ימלאו */}
                  <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    style={{
                      position: 'absolute',
                      left: '-9999px',
                      width: '1px',
                      height: '1px',
                      opacity: 0,
                      pointerEvents: 'none',
                      tabIndex: -1
                    }}
                    autoComplete="off"
                    aria-hidden="true"
                  />
                  <div className="consent-section">
                    <div className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        id="agreeTerms"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="consent-checkbox"
                      />
                      <label htmlFor="agreeTerms" className="consent-label">
                        אני מאשר/ת את תקנון ההצטרפות המופיע כאן של רשת מחסני השוק
                      </label>
                    </div>
                    
                    <div className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        id="agreePrivacy"
                        checked={agreePrivacy}
                        onChange={(e) => setAgreePrivacy(e.target.checked)}
                        className="consent-checkbox"
                      />
                      <label htmlFor="agreePrivacy" className="consent-label">
                        אני מאשר/ת שחברת כ.נ. מחסני השוק בע"מ (service@mck.co.il) תעשה שימוש במידע שמסרתי או ייאסף אודותיי על-ידה לצורך הצטרפות למועדון הלקוחות, לרבות לצרכים סטטיסטיים, עסקיים ושיווקיים, וכן תפנה אליי באמצעי תקשורת שונים, לרבות באמצעות דוא"ל והודעות טקסט לצורך משלוח הצעות שיווקיות ודיוור ישיר והכל בהתאם למדיניות הפרטיות. ידוע לי כי איני חייב להסכים לכך וכי אם לא אסכים לעיבוד המידע כמפורט לא אוכל להצטרף למועדון הלקוחות. אני מודע/ת לזכויותיי לעיון ותיקון בנוגע למידע.
                      </label>
                    </div>
                  </div>
                  
                  {submitError && (
                    <div className="submit-error-message">{submitError}</div>
                  )}
                  <div className="form-buttons-vertical">
                    <button 
                      type="submit" 
                      className="submit-button"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <FiLoader className="submit-icon loading-spinner" />
                          שולח...
                        </>
                      ) : (
                        <>
                          <FiBell className="submit-icon" />
                          {getButtonText()}
                        </>
                      )}
                    </button>
                    <button 
                      type="button" 
                      className="back-button" 
                      onClick={handleBackStep}
                      disabled={isSubmitting}
                    >
                      חזרה
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
})

SecretDealsStrip.displayName = 'SecretDealsStrip'

export default SecretDealsStrip

