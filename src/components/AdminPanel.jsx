import { useState, useEffect } from 'react'
import { FiTrash2, FiX, FiPlus, FiImage, FiLink, FiSave, FiLogOut, FiShield } from 'react-icons/fi'
import { supabase } from '../lib/supabase'
import './AdminPanel.css'

function AdminPanel() {
  console.log('✅ AdminPanel component loaded!')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [user, setUser] = useState(null)
  
  const [messages, setMessages] = useState([])
  const [blockedIPs, setBlockedIPs] = useState([])
  const [forbiddenWords, setForbiddenWords] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [analytics, setAnalytics] = useState({
    submissions: 0,
    whatsappClicks: 0,
    dailySubmissions: {},
    dailyClicks: {}
  })
  
  const [newBlockedIP, setNewBlockedIP] = useState('')
  const [newForbiddenWord, setNewForbiddenWord] = useState('')
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    text: '',
    image_url: '',
    link_url: '',
    link_text: ''
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  
  const [activeTab, setActiveTab] = useState('messages')

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

  // עדכון אוטומטי של הודעות כל 3 שניות (רק אם מחובר כאדמין)
  useEffect(() => {
    if (!isAuthenticated) return

    // טעינה ראשונית
    loadMessages()

    // עדכון אוטומטי כל 3 שניות
    const interval = setInterval(() => {
      if (activeTab === 'messages') {
        loadMessages()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isAuthenticated, activeTab])

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
    await Promise.all([
      loadMessages(),
      loadBlockedIPs(),
      loadForbiddenWords(),
      loadAnnouncements(),
      loadAnalytics()
    ])
  }

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  const loadMessages = async () => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'list', limit: 100 })
      })
      const data = await response.json()
      if (data.messages) setMessages(data.messages)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const loadBlockedIPs = async () => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-api/blocked-ips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'list' })
      })
      const data = await response.json()
      if (data.blocked) setBlockedIPs(data.blocked)
    } catch (error) {
      console.error('Error loading blocked IPs:', error)
    }
  }

  const loadForbiddenWords = async () => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-api/forbidden-words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'list' })
      })
      const data = await response.json()
      if (data.words) setForbiddenWords(data.words)
    } catch (error) {
      console.error('Error loading forbidden words:', error)
    }
  }

  const loadAnnouncements = async () => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-api/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'list' })
      })
      const data = await response.json()
      if (data.announcements) setAnnouncements(data.announcements)
    } catch (error) {
      console.error('Error loading announcements:', error)
    }
  }

  const deleteMessage = async (messageId) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      await fetch(`${supabaseUrl}/functions/v1/admin-api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'delete', messageId })
      })
      loadMessages()
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const addBlockedIP = async () => {
    if (!newBlockedIP.trim()) return
    try {
      const token = await getAuthToken()
      if (!token) return

      await fetch(`${supabaseUrl}/functions/v1/admin-api/blocked-ips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'add', ip_address: newBlockedIP, reason: 'חסום על ידי אדמין' })
      })
      setNewBlockedIP('')
      loadBlockedIPs()
    } catch (error) {
      console.error('Error adding blocked IP:', error)
    }
  }

  const removeBlockedIP = async (id) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      await fetch(`${supabaseUrl}/functions/v1/admin-api/blocked-ips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'remove', id })
      })
      loadBlockedIPs()
    } catch (error) {
      console.error('Error removing blocked IP:', error)
    }
  }

  const blockIPFromMessage = async (ipAddress, messageId) => {
    if (!ipAddress || ipAddress === 'unknown' || ipAddress === 'system') {
      alert('לא ניתן לחסום IP זה')
      return
    }

    if (!confirm(`האם אתה בטוח שברצונך לחסום את ה-IP: ${ipAddress}?`)) {
      return
    }

    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-api/blocked-ips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          action: 'add', 
          ip_address: ipAddress, 
          reason: 'חסום ממסך ההודעות' 
        })
      })

      if (response.ok) {
        alert(`ה-IP ${ipAddress} נחסם בהצלחה`)
        loadBlockedIPs()
      } else {
        const error = await response.json()
        alert(`שגיאה בחסימת IP: ${error.error || 'שגיאה לא ידועה'}`)
      }
    } catch (error) {
      console.error('Error blocking IP:', error)
      alert('שגיאה בחסימת IP')
    }
  }

  const addForbiddenWord = async () => {
    if (!newForbiddenWord.trim()) return
    try {
      const token = await getAuthToken()
      if (!token) return

      await fetch(`${supabaseUrl}/functions/v1/admin-api/forbidden-words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'add', word: newForbiddenWord })
      })
      setNewForbiddenWord('')
      loadForbiddenWords()
    } catch (error) {
      console.error('Error adding forbidden word:', error)
    }
  }

  const removeForbiddenWord = async (id) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      await fetch(`${supabaseUrl}/functions/v1/admin-api/forbidden-words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'remove', id })
      })
      loadForbiddenWords()
    } catch (error) {
      console.error('Error removing forbidden word:', error)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // בדיקת גודל (מקסימום 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('התמונה גדולה מדי. מקסימום 5MB')
      return
    }

    // בדיקת סוג קובץ
    if (!file.type.startsWith('image/')) {
      alert('יש לבחור קובץ תמונה בלבד')
      return
    }

    setSelectedImage(file)
    
    // יצירת preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }


  const createAnnouncement = async () => {
    if (!newAnnouncement.text.trim()) return

    setUploadingImage(true)
    try {
      const token = await getAuthToken()
      if (!token) {
        setUploadingImage(false)
        return
      }

      let finalImageUrl = newAnnouncement.image_url

      // אם יש תמונה שנבחרה אבל לא הועלתה, העלה אותה קודם
      if (selectedImage && !newAnnouncement.image_url) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            alert('אין הרשאות')
            setUploadingImage(false)
            return
          }

          // יצירת שם קובץ ייחודי
          const fileExt = selectedImage.name.split('.').pop()
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `announcements/${fileName}`

          // העלאת התמונה ל-Supabase Storage
          const { data, error } = await supabase.storage
            .from('announcement-images')
            .upload(filePath, selectedImage, {
              cacheControl: '3600',
              upsert: false
            })

          if (error) {
            console.error('Storage upload error:', error)
            throw error
          }

          // קבלת URL ציבורי
          const { data: { publicUrl } } = supabase.storage
            .from('announcement-images')
            .getPublicUrl(filePath)

          finalImageUrl = publicUrl
          console.log('Image uploaded successfully:', publicUrl)
        } catch (error) {
          console.error('Error uploading image:', error)
          alert('שגיאה בהעלאת התמונה: ' + error.message)
          setUploadingImage(false)
          return
        }
      }

      // שמירת ההודעה עם התמונה
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-api/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          action: 'create', 
          title: newAnnouncement.title,
          text: newAnnouncement.text,
          image_url: finalImageUrl || '',
          link_url: newAnnouncement.link_url || '',
          link_text: newAnnouncement.link_text || ''
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'שגיאה לא ידועה' }))
        throw new Error(errorData.error || 'שגיאה בשמירת ההודעה')
      }

      // איפוס הטופס
      setNewAnnouncement({ title: '', text: '', image_url: '', link_url: '', link_text: '' })
      setSelectedImage(null)
      setImagePreview(null)
      
      // טעינה מחדש של ההודעות
      await loadAnnouncements()
      
      alert('ההודעה נשמרה בהצלחה! התמונה וההודעה יופיעו בצ\'אט.')
    } catch (error) {
      console.error('Error creating announcement:', error)
      alert('שגיאה בשמירת ההודעה: ' + error.message)
    } finally {
      setUploadingImage(false)
    }
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

      <div className="admin-tabs">
        <button 
          className={activeTab === 'messages' ? 'active' : ''} 
          onClick={() => setActiveTab('messages')}
        >
          הודעות ({messages.length})
        </button>
        <button 
          className={activeTab === 'blocked' ? 'active' : ''} 
          onClick={() => setActiveTab('blocked')}
        >
          IPs חסומים ({blockedIPs.length})
        </button>
        <button 
          className={activeTab === 'words' ? 'active' : ''} 
          onClick={() => setActiveTab('words')}
        >
          מילים אסורות ({forbiddenWords.length})
        </button>
        <button 
          className={activeTab === 'announcements' ? 'active' : ''} 
          onClick={() => setActiveTab('announcements')}
        >
          הודעות מודגשות ({announcements.length})
        </button>
        <button 
          className={activeTab === 'analytics' ? 'active' : ''} 
          onClick={() => {
            setActiveTab('analytics')
            loadAnalytics()
          }}
        >
          דוח רישומים
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'messages' && (
          <div className="admin-section">
            <h2>הודעות צ'אט</h2>
            <div className="messages-list">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-item ${msg.is_ai ? 'ai' : 'user'}`}>
                  <div className="message-header">
                    <span className="message-user-name">{msg.user_name}</span>
                    <span className="message-time">{new Date(msg.created_at).toLocaleString('he-IL')}</span>
                    {msg.ip_address && <span className="message-ip">IP: {msg.ip_address}</span>}
                    <div className="message-actions">
                      {!msg.is_ai && msg.ip_address && msg.ip_address !== 'unknown' && msg.ip_address !== 'system' && (
                        <button 
                          onClick={() => blockIPFromMessage(msg.ip_address, msg.id)} 
                          className="block-ip-button-admin"
                          title={`חסום IP: ${msg.ip_address}`}
                        >
                          <FiShield /> חסום IP
                        </button>
                      )}
                      <button 
                        onClick={() => deleteMessage(msg.id)} 
                        className="delete-button"
                        title="מחק הודעה"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                  <div className="message-text">{msg.message_text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'blocked' && (
          <div className="admin-section">
            <h2>IPs חסומים</h2>
            <div className="add-item-form">
              <input
                type="text"
                placeholder="כתובת IP (למשל: 192.168.1.1)"
                value={newBlockedIP}
                onChange={(e) => setNewBlockedIP(e.target.value)}
                className="admin-input"
                dir="ltr"
              />
              <button onClick={addBlockedIP} className="add-button">
                <FiPlus /> הוסף IP חסום
              </button>
            </div>
            <div className="items-list">
              {blockedIPs.map((ip) => (
                <div key={ip.id} className="item-card">
                  <div className="item-info">
                    <strong>{ip.ip_address}</strong>
                    {ip.reason && <span className="item-reason">{ip.reason}</span>}
                    <span className="item-date">{new Date(ip.blocked_at).toLocaleString('he-IL')}</span>
                  </div>
                  <button onClick={() => removeBlockedIP(ip.id)} className="remove-button">
                    <FiX /> הסר חסימה
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'words' && (
          <div className="admin-section">
            <h2>מילים אסורות</h2>
            <div className="add-item-form">
              <input
                type="text"
                placeholder="מילה אסורה"
                value={newForbiddenWord}
                onChange={(e) => setNewForbiddenWord(e.target.value)}
                className="admin-input"
                dir="rtl"
              />
              <button onClick={addForbiddenWord} className="add-button">
                <FiPlus /> הוסף מילה
              </button>
            </div>
            <div className="items-list">
              {forbiddenWords.map((word) => (
                <div key={word.id} className="item-card">
                  <span className="item-text">{word.word}</span>
                  <button onClick={() => removeForbiddenWord(word.id)} className="remove-button">
                    <FiX /> הסר
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="admin-section">
            <h2>הודעות מודגשות</h2>
            <div className="announcement-form">
              <input
                type="text"
                placeholder="כותרת (אופציונלי)"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                className="admin-input"
                dir="rtl"
              />
              <textarea
                placeholder="טקסט ההודעה *"
                value={newAnnouncement.text}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, text: e.target.value})}
                className="admin-textarea"
                dir="rtl"
                rows={4}
                required
              />
              
              <div className="image-upload-section">
                <label className="image-upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="image-upload-input"
                    disabled={uploadingImage}
                  />
                  <span className="image-upload-button">
                    {uploadingImage ? 'מעלה...' : selectedImage ? 'בחר תמונה אחרת' : 'העלה תמונה'}
                  </span>
                </label>
                
                {(imagePreview || newAnnouncement.image_url) && (
                  <div className="image-preview-container">
                    <img 
                      src={imagePreview || newAnnouncement.image_url} 
                      alt="Preview" 
                      className="image-preview" 
                    />
                    {selectedImage && !uploadingImage && (
                      <span className="image-preview-note">התמונה תועלה בעת השמירה</span>
                    )}
                    {(newAnnouncement.image_url || imagePreview) && (
                      <button 
                        onClick={() => {
                          setSelectedImage(null)
                          setImagePreview(null)
                          setNewAnnouncement({...newAnnouncement, image_url: ''})
                        }}
                        className="remove-image-button"
                        disabled={uploadingImage}
                      >
                        הסר תמונה
                      </button>
                    )}
                  </div>
                )}
              </div>

              <input
                type="text"
                placeholder="קישור (URL)"
                value={newAnnouncement.link_url}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, link_url: e.target.value})}
                className="admin-input"
                dir="ltr"
              />
              <input
                type="text"
                placeholder="טקסט לקישור (אופציונלי)"
                value={newAnnouncement.link_text}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, link_text: e.target.value})}
                className="admin-input"
                dir="rtl"
              />
              <button onClick={createAnnouncement} className="save-button" disabled={uploadingImage}>
                <FiSave /> שמור הודעה מודגשת
              </button>
            </div>
            <div className="announcements-list">
              {announcements.map((ann) => (
                <div key={ann.id} className="announcement-card">
                  {ann.image_url && <img src={ann.image_url} alt={ann.title} className="announcement-image" />}
                  {ann.title && <h3>{ann.title}</h3>}
                  <p>{ann.text}</p>
                  {ann.link_url && (
                    <a href={ann.link_url} target="_blank" rel="noopener noreferrer" className="announcement-link">
                      {ann.link_text || ann.link_url}
                    </a>
                  )}
                  <div className="announcement-actions">
                    <button 
                      onClick={async () => {
                        try {
                          const token = await getAuthToken()
                          if (!token) return

                          await fetch(`${supabaseUrl}/functions/v1/admin-api/announcements`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ action: 'delete', id: ann.id })
                          })
                          loadAnnouncements()
                        } catch (error) {
                          console.error('Error deleting announcement:', error)
                        }
                      }} 
                      className="remove-button"
                    >
                      <FiTrash2 /> מחק
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

