import { useState, useEffect } from 'react'
import { FiLogOut } from 'react-icons/fi'
import { supabase } from '../lib/supabase'
import './AdminPanel.css'

function AdminPanel() {
  console.log('✅ AdminPanel component loaded!')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [user, setUser] = useState(null)
  
  const [analytics, setAnalytics] = useState({
    submissions: 0,
    whatsappClicks: 0,
    dailySubmissions: {},
    dailyClicks: {}
  })
  
  const [activeTab, setActiveTab] = useState('analytics')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

  // Supabase Auth
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) throw error

      // בדיקה אם המשתמש הוא אדמין
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (adminError || !adminData) {
        await supabase.auth.signOut()
        setLoginError('אין לך הרשאות אדמין')
        return
      }

      setUser(data.user)
      setIsAuthenticated(true)
      loadData()
    } catch (error) {
      console.error('Login error:', error)
      setLoginError(error.message || 'שם משתמש או סיסמה שגויים')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsAuthenticated(false)
    setUser(null)
  }

  useEffect(() => {
    // בדיקה אם המשתמש כבר מחובר
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // בדיקה אם המשתמש הוא אדמין
        supabase
          .from('admins')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setUser(session.user)
              setIsAuthenticated(true)
              loadData()
            } else {
              supabase.auth.signOut()
            }
          })
      }
    })

    // האזנה לשינויים ב-auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        supabase
          .from('admins')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setUser(session.user)
              setIsAuthenticated(true)
              loadData()
            } else {
              setIsAuthenticated(false)
              setUser(null)
            }
          })
      } else {
        setIsAuthenticated(false)
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])


  const loadAnalytics = async () => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-api/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'stats' })
      })

      if (response.ok) {
        const data = await response.json()
        if (data) setAnalytics(data)
      }
    } catch (error) {
      // Error loading analytics
    }
  }

  const loadData = async () => {
    await loadAnalytics()
  }

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-container">
          <h1 className="admin-login-title">מערכת ניהול - Yellow Friday</h1>
          <form onSubmit={handleLogin} className="admin-login-form">
            <input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="admin-login-input"
              dir="ltr"
              required
            />
            <input
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-login-input"
              dir="rtl"
              required
            />
            {loginError && <div className="admin-login-error">{loginError}</div>}
            <button type="submit" className="admin-login-button">התחבר</button>
          </form>
          <p className="admin-login-note">התחבר עם האימייל והסיסמה שלך ב-Supabase</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>מערכת ניהול - Yellow Friday</h1>
        <button onClick={handleLogout} className="admin-logout-button">
          <FiLogOut /> התנתק
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'analytics' && (
          <div className="admin-section">
            <h2>דוח רישומים וקליקים</h2>
            <div className="analytics-dashboard">
              <div className="analytics-stats">
                <div className="stat-card">
                  <h3>סה"כ רישומים</h3>
                  <div className="stat-number">{analytics.submissions}</div>
                </div>
                <div className="stat-card">
                  <h3>סה"כ קליקים על ווטסאפ</h3>
                  <div className="stat-number">{analytics.whatsappClicks}</div>
                </div>
                <div className="stat-card">
                  <h3>אחוז המרה</h3>
                  <div className="stat-number">
                    {analytics.submissions > 0 
                      ? ((analytics.whatsappClicks / analytics.submissions) * 100).toFixed(1) 
                      : 0}%
                  </div>
                </div>
              </div>
              
              <div className="daily-stats">
                <h3>רישומים לפי יום (שבוע אחרון)</h3>
                <div className="daily-chart">
                  {Object.entries(analytics.dailySubmissions || {}).map(([date, count]) => (
                    <div key={date} className="daily-bar">
                      <div className="bar-label">{new Date(date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}</div>
                      <div className="bar-container">
                        <div className="bar" style={{ height: `${(count / Math.max(...Object.values(analytics.dailySubmissions || {1: 1}))) * 100}%` }}>
                          {count}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="daily-stats">
                <h3>קליקים על ווטסאפ לפי יום (שבוע אחרון)</h3>
                <div className="daily-chart">
                  {Object.entries(analytics.dailyClicks || {}).map(([date, count]) => (
                    <div key={date} className="daily-bar">
                      <div className="bar-label">{new Date(date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}</div>
                      <div className="bar-container">
                        <div className="bar clicks-bar" style={{ height: `${(count / Math.max(...Object.values(analytics.dailyClicks || {1: 1}), 1)) * 100}%` }}>
                          {count}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPanel

