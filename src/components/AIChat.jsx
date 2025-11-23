import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { FiSend, FiMessageCircle, FiUser, FiBell, FiCheck } from 'react-icons/fi'
import { supabase } from '../lib/supabase'
import './AIChat.css'

function AIChat({ isPreview = false }) {
  console.log('✅ AIChat component loaded!', { isPreview })
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const [announcements, setAnnouncements] = useState([])
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [cooldownTimer, setCooldownTimer] = useState(0) // טיימר של 60 שניות
  const [inputError, setInputError] = useState('') // שגיאת validation
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [oldestMessageDate, setOldestMessageDate] = useState(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const messageIdCounter = useRef(0)
  const lastMessageTimestamp = useRef(new Date())
  
  // טופס התחלתי
  const [showWelcomeForm, setShowWelcomeForm] = useState(false)
  const [userName, setUserName] = useState('')
  const [userNameInput, setUserNameInput] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [nameError, setNameError] = useState('')
  const [forbiddenWords, setForbiddenWords] = useState([])
  const [connectedUsersCount, setConnectedUsersCount] = useState(55)
  const [showTermsModal, setShowTermsModal] = useState(false)

  const scrollToBottom = (instant = false) => {
    if (instant) {
      // גלילה מיידית בלי animation
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      // גם דרך ה-container ישירות
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const formatTimestamp = (date = new Date()) => {
    const weekdayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
    const weekday = weekdayNames[date.getDay()]
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${weekday} ${day}/${month}/${year} - ${hours}:${minutes}`
  }

  // טעינת מילים אסורות מה-database
  useEffect(() => {
    const loadForbiddenWords = async () => {
      try {
        const { data, error } = await supabase
          .from('forbidden_words')
          .select('word')
        
        if (error) throw error
        
        setForbiddenWords(data.map(item => item.word.toLowerCase()))
      } catch (error) {
        // Error loading forbidden words
      }
    }
    loadForbiddenWords()
  }, [])

  // עדכון מספר לקוחות מחוברים
  useEffect(() => {
    const fetchConnectedUsers = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseAnonKey) return

        const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat/connected-users`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.count && data.count > 0) {
            setConnectedUsersCount(data.count)
          }
        }
      } catch (error) {
        // Error fetching connected users
      }
    }

    // טעינה ראשונית
    fetchConnectedUsers()

    // עדכון כל 5 שניות
    const interval = setInterval(fetchConnectedUsers, 5000)

    return () => clearInterval(interval)
  }, [])

  // בדיקת cookies בטעינה ראשונית (רק אם לא preview)
  useEffect(() => {
    if (isPreview) {
      setShowWelcomeForm(false)
      return
    }
    
    const checkUserCookie = () => {
      try {
        const cookies = document.cookie.split(';')
        const userNameCookie = cookies.find(cookie => cookie.trim().startsWith('chat_user_name='))
        
        if (userNameCookie) {
          const cookieValue = userNameCookie.split('=').slice(1).join('=') // טיפול במקרה שיש = בשם
          const name = decodeURIComponent(cookieValue.trim())
          if (name && name.length > 0) {
            setUserName(name)
            setShowWelcomeForm(false)
            return
          }
        }
        // אם אין cookie, הצג טופס
        setShowWelcomeForm(true)
      } catch (error) {
        setShowWelcomeForm(true)
      }
    }
    
    checkUserCookie()
  }, [isPreview])

  // בדיקת שם נגד מילים אסורות
  const validateName = (name) => {
    if (!name || name.trim().length < 2) {
      return 'השם חייב להכיל לפחות 2 תווים'
    }

    if (name.trim().length > 20) {
      return 'השם ארוך מדי (מקסימום 20 תווים)'
    }

    // בדיקת עברית בלבד
    const hebrewRegex = /^[\u0590-\u05FF\s]+$/
    if (!hebrewRegex.test(name.trim())) {
      return 'השם חייב להכיל אותיות עבריות בלבד'
    }

    // בדיקת מילים אסורות
    const nameLower = name.toLowerCase().trim()
    for (const word of forbiddenWords) {
      if (nameLower.includes(word)) {
        return 'השם מכיל מילה אסורה'
      }
    }

    // מילים אסורות בסיסיות
    const basicForbidden = ['קללה', 'מחורבן', 'זין', 'כוס', 'פאק', 'שיט']
    for (const word of basicForbidden) {
      if (nameLower.includes(word)) {
        return 'השם מכיל מילה אסורה'
      }
    }

    return null
  }

  // שמירת שם ב-cookie
  const saveUserName = (name) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }
    
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 1) // שנה אחת
    // שמירה ב-cookie עם SameSite
    const cookieString = `chat_user_name=${encodeURIComponent(trimmedName)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
    document.cookie = cookieString
    
    // בדיקה מיידית שהשם נשמר
    setTimeout(() => {
      const cookies = document.cookie.split(';')
      const savedCookie = cookies.find(cookie => cookie.trim().startsWith('chat_user_name='))
      if (savedCookie) {
        const cookieValue = savedCookie.split('=').slice(1).join('=') // טיפול במקרה שיש = בשם
        const savedName = decodeURIComponent(cookieValue.trim())
        if (savedName && savedName === trimmedName) {
          setUserName(savedName)
          setShowWelcomeForm(false)
        }
      } else {
        // נסה שוב
        document.cookie = cookieString
      }
    }, 100)
  }

  // טיפול בשליחת טופס התחלתי
  const handleWelcomeSubmit = (e) => {
    e.preventDefault()
    
    const error = validateName(userNameInput)
    if (error) {
      setNameError(error)
      return
    }

    if (!acceptedTerms) {
      setNameError('יש לאשר את התקנון')
      return
    }

    setNameError('')
    saveUserName(userNameInput.trim())
  }

  // טעינת הודעות מה-database
  const loadMessages = useCallback(async (limit = 20, beforeDate = null) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey) return []

      let query = supabase
        .from('chat_messages')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (beforeDate) {
        query = query.lt('created_at', beforeDate.toISOString())
      }

      const { data: chatMessages, error } = await query

      if (error) {
        return []
      }

      if (!chatMessages || chatMessages.length === 0) {
        return []
      }

      // המרה לפורמט ההודעות
      const formattedMessages = chatMessages.map(msg => ({
        id: msg.id,
        user: msg.user_name === 'AI' ? 'שוקי הבוט' : msg.user_name, // החלפת "AI" ב-"שוקי הבוט" להודעות ישנות
        text: msg.message_text,
        timestamp: formatTimestamp(new Date(msg.created_at)),
        timestampDate: new Date(msg.created_at),
        isAI: msg.is_ai,
        replyTo: msg.reply_to,
        isAnnouncement: false
      }))

      // בדיקה אם יש עוד הודעות
      if (chatMessages.length < limit) {
        setHasMoreMessages(false)
      } else {
        setHasMoreMessages(true)
      }

      // עדכון התאריך של ההודעה הישנה ביותר
      if (formattedMessages.length > 0) {
        const oldest = formattedMessages[formattedMessages.length - 1]
        setOldestMessageDate(oldest.timestampDate)
      }

      return formattedMessages.reverse() // הפוך כדי שהחדש יהיה למטה
    } catch (error) {
      return []
    }
  }, [])

  // טעינת הודעות נוספות (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages || !oldestMessageDate) return

    setIsLoadingMore(true)
    try {
      const olderMessages = await loadMessages(20, oldestMessageDate)
      
      if (olderMessages.length > 0) {
        setMessages(prev => [...olderMessages, ...prev])
      } else {
        setHasMoreMessages(false)
      }
    } catch (error) {
      // Error loading more messages
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMoreMessages, oldestMessageDate, loadMessages])

  // בדיקת גלילה למעלה לטעינת הודעות נוספות
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      // אם המשתמש גולל למעלה קרוב לראש (100px מהתחלה)
      if (container.scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
        const scrollHeight = container.scrollHeight
        loadMoreMessages()
        // שמירה על מיקום הגלילה אחרי טעינה
        setTimeout(() => {
          container.scrollTop = container.scrollHeight - scrollHeight
        }, 100)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMoreMessages, isLoadingMore, loadMoreMessages])

  // טעינת הודעות ראשונית
  useEffect(() => {
    const initialLoad = async () => {
      const initialMessages = await loadMessages(20)
      // שמירה על הודעות מודגשות אם כבר נטענו
      setMessages(prev => {
        const announcements = prev.filter(msg => msg.isAnnouncement)
        const allMessages = [...initialMessages, ...announcements]
        const sorted = allMessages.sort((a, b) => {
          const timeA = a.timestampDate || new Date(0)
          const timeB = b.timestampDate || new Date(0)
          return timeA.getTime() - timeB.getTime()
        })
        
        // עדכון תאריך ההודעה האחרונה
        if (sorted.length > 0) {
          const lastMsg = sorted[sorted.length - 1]
          lastMessageTimestamp.current = lastMsg.timestampDate || new Date()
        }
        
        return sorted
      })
    }
    initialLoad()
  }, [loadMessages])

  // פונקציה להוספת הודעה חדשה (משותפת ל-realtime ו-polling)
  const addNewMessage = useCallback((newMessage) => {
    setMessages(prev => {
      // בדיקה לפי ID
      const existsById = prev.some(msg => msg.id === newMessage.id)
      if (existsById) {
        return prev
      }
      
      // בדיקה לפי תוכן ותאריך (למניעת כפילויות)
      // עבור הודעות משתמשים, נבדוק גם לפי תוכן דומה (בתוך 10 שניות)
      const existsByContent = prev.some(msg => {
        if (msg.isAI !== newMessage.is_ai) return false
        
        // עבור הודעות משתמשים, בדיקה יותר גמישה
        if (!newMessage.is_ai) {
          // אם זו הודעה של משתמש, נבדוק לפי תוכן דומה ותאריך קרוב
          if (msg.text === newMessage.message_text) {
            const msgTime = new Date(msg.timestampDate || 0)
            const newMsgTime = new Date(newMessage.created_at)
            const timeDiff = Math.abs(msgTime.getTime() - newMsgTime.getTime())
            // אם ההודעות זהות בתוך 10 שניות, זה כפילות
            if (timeDiff < 10000) {
              return true
            }
          }
          return false
        } else {
          // עבור הודעות AI, בדיקה רגילה
          if (msg.text !== newMessage.message_text) return false
          const msgTime = new Date(msg.timestampDate || 0)
          const newMsgTime = new Date(newMessage.created_at)
          const timeDiff = Math.abs(msgTime.getTime() - newMsgTime.getTime())
          // אם ההודעות זהות בתוך 5 שניות, זה כפילות
          return timeDiff < 5000
        }
      })
      
      if (existsByContent) {
        return prev
      }
      
      // הוספת ההודעה החדשה
      const message = {
        id: newMessage.id,
        user: newMessage.user_name === 'AI' ? 'שוקי הבוט' : newMessage.user_name, // החלפת "AI" ב-"שוקי הבוט" להודעות ישנות
        text: newMessage.message_text,
        timestamp: formatTimestamp(new Date(newMessage.created_at)),
        timestampDate: new Date(newMessage.created_at),
        isAI: newMessage.is_ai,
        replyTo: newMessage.reply_to,
        isAnnouncement: false
      }

      // הסרת הודעות מקומיות זמניות (שנוצרו לפני שמירה ב-database)
      // אם יש הודעה מקומית עם תוכן דומה, נסיר אותה
      const filtered = prev.filter(msg => {
        // אם זו הודעה מקומית (לא מ-database) עם תוכן דומה, נסיר אותה
        if (!msg.isAI && !newMessage.is_ai && msg.text === newMessage.message_text) {
          const msgTime = new Date(msg.timestampDate || 0)
          const newMsgTime = new Date(newMessage.created_at)
          const timeDiff = Math.abs(msgTime.getTime() - newMsgTime.getTime())
          // אם ההודעות זהות בתוך 10 שניות, נסיר את המקומית
          if (timeDiff < 10000) {
            return false // הסר את ההודעה המקומית
          }
        }
        return true
      })

      const updated = [...filtered, message]
      const sorted = updated.sort((a, b) => {
        const timeA = a.timestampDate || new Date(0)
        const timeB = b.timestampDate || new Date(0)
        return timeA.getTime() - timeB.getTime()
      })

      // עדכון תאריך ההודעה האחרונה
      const newMsgDate = new Date(newMessage.created_at)
      if (newMsgDate > lastMessageTimestamp.current) {
        lastMessageTimestamp.current = newMsgDate
      }

      // גלול למטה אם זו הודעה חדשה (AI או משתמש)
      // ב-preview mode תמיד לגלול, אחרת רק אם המשתמש כבר גלל למטה
      if (isPreview) {
        // ב-preview mode תמיד לגלול אוטומטית להודעה החדשה - מיידית
        setTimeout(() => {
          scrollToBottom(true)
        }, 50)
      } else {
        setTimeout(() => {
          const container = messagesContainerRef.current
          if (container) {
            // ב-mode רגיל רק אם המשתמש כבר גלל למטה
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200
            if (isNearBottom) {
              scrollToBottom()
            }
          }
        }, 100)
      }

      return sorted
    })
  }, [])

  // Realtime subscription להודעות חדשות - מעדכן את כל ההודעות בזמן אמת
  useEffect(() => {
    const channel = supabase
      .channel('chat_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMessage = payload.new
          
          // בדיקה שההודעה לא נמחקה
          if (newMessage.deleted_at) {
            return
          }
          
          // הוספת כל ההודעות - גם של משתמשים וגם של AI
          addNewMessage(newMessage)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [addNewMessage])

  // Polling כגיבוי ל-realtime - בודק הודעות חדשות כל 2 שניות
  useEffect(() => {
    const pollForNewMessages = async () => {
      try {
        const { data: newMessages, error } = await supabase
          .from('chat_messages')
          .select('*')
          .is('deleted_at', null)
          .gt('created_at', lastMessageTimestamp.current.toISOString())
          .order('created_at', { ascending: true })
          .limit(50)

        if (error) {
          return
        }

        if (newMessages && newMessages.length > 0) {
          newMessages.forEach(msg => {
            addNewMessage(msg)
            // עדכון תאריך ההודעה האחרונה אחרי כל הודעה
            const msgDate = new Date(msg.created_at)
            if (msgDate > lastMessageTimestamp.current) {
              lastMessageTimestamp.current = msgDate
            }
          })
        }
      } catch (error) {
        // Error in polling
      }
    }

    // Polling כל 2 שניות
    const pollingInterval = setInterval(pollForNewMessages, 2000)

    return () => {
      clearInterval(pollingInterval)
    }
  }, [addNewMessage])

  // גלילה מיידית למטה אחרי טעינה ראשונית - אחרי שהדום רונדר
  useLayoutEffect(() => {
    if (isInitialLoad && messages.length > 0 && messagesContainerRef.current) {
      // גלילה מיידית בלי animation - אחרי שהדום רונדר
      const container = messagesContainerRef.current
      // השתמש ב-requestAnimationFrame כפול כדי לוודא שהדום כבר רונדר לגמרי
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // הגדר scroll position ישירות למטה
          container.scrollTop = container.scrollHeight
          // גם דרך scrollIntoView כגיבוי
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
          }
          // סימון שסיימנו את הטעינה הראשונית
          setIsInitialLoad(false)
        })
      })
    }
  }, [isInitialLoad, messages.length])

  useEffect(() => {
    // גלול למטה רק אם זה לא טעינה ראשונית או אם יש הודעה חדשה שנשלחה
    // אבל רק אם יש הודעות (לא בטעינה ראשונית)
    if (!isInitialLoad && messages.length > 0) {
      if (isPreview) {
        // ב-preview mode תמיד לגלול למטה - מיידית
        setTimeout(() => {
          scrollToBottom(true)
        }, 50)
      } else {
        // ב-mode רגיל רק אם ההודעה נשלחה ב-5 שניות האחרונות
        const lastMessage = messages[messages.length - 1]
        const now = new Date()
        const messageTime = lastMessage.timestampDate || new Date(0)
        const timeDiff = now.getTime() - messageTime.getTime()
        
        if (timeDiff < 5000) {
          scrollToBottom()
        }
      }
    }
  }, [messages, isInitialLoad, isPreview])

  // טעינת הודעות מודגשות
  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const { data: activeAnnouncements, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        
        if (error) throw error

        const filtered = activeAnnouncements.filter(ann => {
          if (ann.expires_at) {
            return new Date(ann.expires_at) > new Date()
          }
          return true
        })
        
        setAnnouncements(filtered)
        
        // הוספת הודעות מודגשות לשרשרת ההודעות
        setMessages(prevMessages => {
          // הסר הודעות מודגשות קודמות
          const withoutAnnouncements = prevMessages.filter(msg => !msg.isAnnouncement)
          
          // הוסף הודעות מודגשות חדשות - הן יופיעו בסוף (למטה)
          const announcementMessages = filtered.map((ann) => ({
            id: `announcement-${ann.id}`,
            user: 'מערכת',
            text: ann.text,
            timestamp: formatTimestamp(new Date(ann.created_at)),
            timestampDate: new Date(ann.created_at),
            isAI: true,
            isAnnouncement: true,
            announcement: ann
          }))
          
          // מיון לפי תאריך - הודעות מודגשות יופיעו לפי תאריך יצירה
          // הסרת כפילויות לפי ID
          const allMessages = [...withoutAnnouncements, ...announcementMessages]
          const uniqueMessages = allMessages.reduce((acc, msg) => {
            if (!acc.find(m => m.id === msg.id)) {
              acc.push(msg)
            }
            return acc
          }, [])
          
          return uniqueMessages.sort((a, b) => {
            const timeA = a.timestampDate || new Date(0)
            const timeB = b.timestampDate || new Date(0)
            return timeA.getTime() - timeB.getTime() // מהישן לחדש
          })
        })
      } catch (error) {
        // Error loading announcements
      }
    }

    loadAnnouncements()
    const interval = setInterval(loadAnnouncements, 30000) // רענון כל 30 שניות
    return () => clearInterval(interval)
  }, [])

  // טיימר cooldown - 60 שניות בין הודעות
  useEffect(() => {
    if (cooldownTimer > 0) {
      const timer = setTimeout(() => {
        setCooldownTimer(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldownTimer])

  // פונקציה לניקוי טקסט - הסרת רווחים וסימנים מיוחדים
  const cleanText = (text) => {
    return text.toLowerCase()
      .replace(/[\s\-_\.\(\)\[\]\/\\\u200b\u200c\u200d]/g, '') // הסרת רווחים, מקפים, נקודות, וסימנים בלתי נראים
  }

  // פונקציה לבדיקת דמיון בין מחרוזות (Levenshtein distance פשוט)
  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    // בדיקה אם המחרוזת הקצרה מופיעה כחלק מהארוכה
    if (longer.includes(shorter)) {
      return shorter.length / longer.length
    }
    
    // בדיקת תווים משותפים
    let commonChars = 0
    const shorterChars = shorter.split('')
    const longerChars = longer.split('')
    
    for (let i = 0; i < shorterChars.length; i++) {
      if (longerChars.includes(shorterChars[i])) {
        commonChars++
        const index = longerChars.indexOf(shorterChars[i])
        longerChars.splice(index, 1) // הסר כדי לא לספור פעמיים
      }
    }
    
    return commonChars / longer.length
  }

  // בדיקת מילים אסורות - רק המילים עצמן, ללא ניסיונות לטשטש
  const checkForbiddenWords = (text) => {
    const textLower = text.toLowerCase()
    const cleanedText = cleanText(text)
    
    // מילים אסורות בסיסיות (מתחרים)
    const basicForbidden = ['ויקטורי', 'סופר פארם', 'שופרסל', 'איקאה', 'רמי לוי', 'מגה', 'אושר עד']
    
    // כל המילים האסורות (מה-database + בסיסיות)
    const allForbiddenWords = [...basicForbidden, ...forbiddenWords]
    
    for (const word of allForbiddenWords) {
      const forbiddenWord = word.toLowerCase().trim()
      if (forbiddenWord.length < 3) continue // דילוג על מילים קצרות מדי
      
      const cleanedForbidden = cleanText(forbiddenWord)
      if (cleanedForbidden.length < 3) continue
      
      // בדיקה 1: האם המילה מופיעה כמילה שלמה (עם גבולות מילים)
      // זה הבדיקה העיקרית - רק אם המילה מופיעה כמילה שלמה
      const wordBoundaryRegex = new RegExp(`\\b${forbiddenWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (wordBoundaryRegex.test(textLower)) {
        return true
      }
      
      // בדיקה 2: האם המילה מופיעה בטקסט המנוקה (גם עם רווחים/סימנים)
      // אבל רק אם זה מילה שלמה (לא חלק ממילה אחרת)
      if (cleanedText.includes(cleanedForbidden)) {
        const index = cleanedText.indexOf(cleanedForbidden)
        const before = index > 0 ? cleanedText[index - 1] : ''
        const after = index + cleanedForbidden.length < cleanedText.length ? cleanedText[index + cleanedForbidden.length] : ''
        
        // אם אין תווים לפני ואחרי, זה מילה שלמה - אסור
        if (!before && !after) {
          return true
        }
      }
    }
    
    return false
  }

  // בדיקת תוכן אסור (URLs, טלפונים, אימיילים, מילים אסורות) - גם עם רווחים וסימנים מיוחדים
  const containsBlockedContent = (text) => {
    const textLower = text.toLowerCase().trim()
    // הסרת רווחים וסימנים מיוחדים לבדיקה
    const cleanedText = textLower.replace(/[\s\-_\.\(\)\[\]\/\\]/g, '')
    
    // בדיקת מילים אסורות עם זיהוי וריאציות
    const hasForbiddenWords = checkForbiddenWords(text)
    if (hasForbiddenWords) {
      return 'ההודעה מכילה תוכן לא מתאים'
    }
    
    // בדיקת ניסיונות לחלץ מידע על ההנחיות/הוראות של ה-AI
    const promptExtractionPatterns = [
      /תכתוב.*הנחיות/i,
      /תכתוב.*הוראות/i,
      /תכתוב.*instructions/i,
      /מה.*הנחיות/i,
      /מה.*הוראות/i,
      /מה.*instructions/i,
      /מה.*system.*prompt/i,
      /מה.*prompt/i,
      /הם.*אמרו.*לך/i,
      /האם.*אמרו.*לך/i,
      /תמיד.*נכון/i,
      /תמיד.*חיובי/i,
      /איך.*אתה.*עובד/i,
      /איך.*את.*עובד/i,
      /מה.*אתה.*יודע/i,
      /מה.*את.*יודע/i,
      /מה.*אתה.*יכול.*לספר/i,
      /מה.*את.*יכול.*לספר/i,
      /תגיד.*לי.*מה.*ההנחיות/i,
      /תגיד.*לי.*מה.*ההוראות/i,
      /תספר.*לי.*על.*ההנחיות/i,
      /תספר.*לי.*על.*ההוראות/i,
      /מה.*הכללים.*שלך/i,
      /מה.*הכללים/i,
      /מה.*אתה.*חייב/i,
      /מה.*את.*חייב/i,
      /מה.*אתה.*צריך/i,
      /מה.*את.*צריך/i,
      /מה.*אתה.*אמור/i,
      /מה.*את.*אמור/i,
      /תציג.*את.*ההנחיות/i,
      /תציג.*את.*ההוראות/i,
      /תראה.*לי.*את.*ההנחיות/i,
      /תראה.*לי.*את.*ההוראות/i,
      /תקרא.*לי.*את.*ההנחיות/i,
      /תקרא.*לי.*את.*ההוראות/i,
      /תפתח.*את.*ההנחיות/i,
      /תפתח.*את.*ההוראות/i,
      /תגלה.*את.*ההנחיות/i,
      /תגלה.*את.*ההוראות/i,
      /תחשוף.*את.*ההנחיות/i,
      /תחשוף.*את.*ההוראות/i,
      /מה.*כתוב.*בהנחיות/i,
      /מה.*כתוב.*בהוראות/i,
      /מה.*כתוב.*ב.*system.*prompt/i,
      /מה.*כתוב.*ב.*prompt/i,
      /איזה.*הנחיות/i,
      /איזה.*הוראות/i,
      /איזה.*instructions/i,
      /איזה.*כללים/i,
      /תעזוב.*את.*התפקיד/i,
      /תעזוב.*את.*התפקיד.*שלך/i,
      /תשכח.*את.*ההנחיות/i,
      /תשכח.*את.*ההוראות/i,
      /תתעלם.*מההנחיות/i,
      /תתעלם.*מהוראות/i,
      /תפעל.*בלי.*ההנחיות/i,
      /תפעל.*בלי.*הוראות/i,
      /תפעל.*כמו.*chatgpt/i,
      /תפעל.*כמו.*gpt/i,
      /תפעל.*כמו.*assistant/i,
      /תפעל.*כמו.*ai/i,
      /תפעל.*כמו.*בוט/i,
      /תפעל.*כמו.*רובוט/i,
      /תפעל.*כמו.*מחשב/i,
      /תפעל.*כמו.*מערכת/i,
      /תפעל.*כמו.*תוכנה/i,
      /תפעל.*כמו.*אפליקציה/i,
      /תפעל.*כמו.*שירות/i,
      /תפעל.*כמו.*ספק/i,
      /תפעל.*כמו.*חברה/i,
      /תפעל.*כמו.*ארגון/i,
      /תפעל.*כמו.*מוסד/i,
      /תפעל.*כמו.*גוף/i,
      /תפעל.*כמו.*מקום/i,
      /תפעל.*כמו.*אתר/i,
      /תפעל.*כמו.*פלטפורמה/i,
      /תפעל.*כמו.*מערכת/i,
      /תפעל.*כמו.*תוכנה/i,
      /תפעל.*כמו.*אפליקציה/i,
      /תפעל.*כמו.*שירות/i,
      /תפעל.*כמו.*ספק/i,
      /תפעל.*כמו.*חברה/i,
      /תפעל.*כמו.*ארגון/i,
      /תפעל.*כמו.*מוסד/i,
      /תפעל.*כמו.*גוף/i,
      /תפעל.*כמו.*מקום/i,
      /תפעל.*כמו.*אתר/i,
      /תפעל.*כמו.*פלטפורמה/i,
    ]
    
    for (const pattern of promptExtractionPatterns) {
      if (pattern.test(textLower)) {
        return 'לא ניתן לשאול שאלות על ההנחיות או ההוראות של המערכת'
      }
    }
    
    // בדיקות נוספות - מילות מפתח ספציפיות
    const suspiciousKeywords = [
      'הנחיות שלך',
      'הוראות שלך',
      'instructions שלך',
      'system prompt',
      'prompt שלך',
      'הכללים שלך',
      'מה אתה חייב',
      'מה אתה צריך',
      'מה אתה אמור',
      'תמיד נכון',
      'תמיד חיובי',
      'הם אמרו לך',
      'האם אמרו לך',
      'תגיד לי מה',
      'תספר לי על',
      'תציג את ההנחיות',
      'תראה לי את ההנחיות',
      'תקרא לי את ההנחיות',
      'תפתח את ההנחיות',
      'תגלה את ההנחיות',
      'תחשוף את ההנחיות',
      'מה כתוב בהנחיות',
      'איזה הנחיות',
      'תעזוב את התפקיד',
      'תשכח את ההנחיות',
      'תתעלם מההנחיות',
      'תפעל בלי ההנחיות',
    ]
    
    for (const keyword of suspiciousKeywords) {
      if (textLower.includes(keyword)) {
        return 'לא ניתן לשאול שאלות על ההנחיות או ההוראות של המערכת'
      }
    }
    
    // בדיקת כתובות אינטרנט
    // 1. http/https
    if (/https?:\/\//i.test(text) || /https?:\/\//i.test(cleanedText)) {
      return 'לא ניתן לשלוח כתובות אינטרנט'
    }
    
    // 2. www.
    if (/www\./i.test(text) || cleanedText.includes('www.')) {
      return 'לא ניתן לשלוח כתובות אינטרנט'
    }
    
    // 3. דומיינים נפוצים (עם או בלי נקודה לפני)
    const domainExtensions = ['com', 'co.il', 'net', 'org', 'io', 'gov', 'edu', 'info', 'biz', 'tv', 'me', 'cc', 'xyz', 'online', 'site', 'website', 'store', 'shop', 'blog', 'app', 'dev']
    for (const ext of domainExtensions) {
      // בדיקה עם נקודה לפני (למשל: .com, .co.il)
      const domainPattern = new RegExp(`[a-z0-9]+[\\.\\-\\_]?${ext.replace('.', '\\.')}`, 'i')
      if (domainPattern.test(cleanedText) || domainPattern.test(textLower)) {
        return 'לא ניתן לשלוח כתובות אינטרנט'
      }
    }
    
    // בדיקת מספרי טלפון (ישראליים) - גם עם רווחים, מקפים, סוגריים
    // הסרת כל מה שאינו ספרה
    const digitsOnly = text.replace(/\D/g, '')
    
    // בדיקת דפוסי טלפון ישראליים
    if (digitsOnly.length >= 9) {
      // טלפון קווי: 02-9XXXXXXXX (9 ספרות) או 0X-XXXXXXXX (10 ספרות)
      if (/^0[2-9]/.test(digitsOnly) && (digitsOnly.length === 9 || digitsOnly.length === 10)) {
        return 'לא ניתן לשלוח מספרי טלפון'
      }
      
      // סלולרי: 05X-XXXXXXX (10 ספרות)
      if (/^05[0-9]/.test(digitsOnly) && digitsOnly.length === 10) {
        return 'לא ניתן לשלוח מספרי טלפון'
      }
      
      // קוד בינלאומי: +972 או 972
      if ((/^\+?972/.test(text.replace(/[\s\-_\.\(\)\[\]\/\\]/g, '')) || /^972/.test(digitsOnly)) && 
          (digitsOnly.length === 12 || digitsOnly.length === 13)) {
        return 'לא ניתן לשלוח מספרי טלפון'
      }
      
      // אם יש 9-10 ספרות רצופות (אפילו עם רווחים), זה כנראה טלפון
      if (digitsOnly.length === 9 || digitsOnly.length === 10) {
        // בדיקה אם יש דפוס טלפון עם רווחים/מקפים
        const phoneWithSpaces = /0[2-9]\s*[\-\.]?\s*\d{7,8}|05[0-9]\s*[\-\.]?\s*\d{7}/
        if (phoneWithSpaces.test(text)) {
          return 'לא ניתן לשלוח מספרי טלפון'
        }
      }
    }
    
    // בדיקת כתובות מייל - גם עם רווחים וסימנים מיוחדים
    // הסרת רווחים לבדיקה
    const emailTestText = text.replace(/\s/g, '')
    
    // דפוס מייל סטנדרטי: something@domain.extension
    const emailPattern = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i
    if (emailPattern.test(emailTestText)) {
      return 'לא ניתן לשלוח כתובות מייל'
    }
    
    // בדיקה נוספת - אם יש @ ואחריו נקודה, זה כנראה מייל
    if (text.includes('@')) {
      // בדיקה אם יש @ ואחריו דומיין תקין
      const atIndex = text.indexOf('@')
      const afterAt = text.substring(atIndex + 1).replace(/\s/g, '')
      if (afterAt.includes('.') && /[a-z0-9]+\.[a-z]{2,}/i.test(afterAt)) {
        return 'לא ניתן לשלוח כתובות מייל'
      }
    }
    
    return null
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading || cooldownTimer > 0) return
    
    // בדיקת תוכן אסור
    const blockedError = containsBlockedContent(inputValue.trim())
    if (blockedError) {
      setInputError(blockedError)
      setTimeout(() => setInputError(''), 3000) // הסרת השגיאה אחרי 3 שניות
      return
    }
    
    setInputError('') // ניקוי שגיאות קודמות

    const question = inputValue.trim()
    const now = new Date()
    const timestamp = formatTimestamp(now)
    // יצירת ID ייחודי עם counter כדי למנוע כפילויות
    messageIdCounter.current += 1
    const userMessageId = `user-${Date.now()}-${messageIdCounter.current}-${Math.random().toString(36).substring(7)}`

    // בדיקה שהמשתמש מילא את הטופס
    if (!userName) {
      setShowWelcomeForm(true)
      return
    }

    // הוסף את הודעת המשתמש
    const userMessage = {
      id: userMessageId,
      user: userName,
      text: question,
      timestamp: timestamp,
      timestampDate: now,
      isAI: false
    }

    setMessages(prev => {
      // בדיקה שההודעה לא קיימת כבר (למניעת כפילויות)
      const exists = prev.some(msg => msg.id === userMessageId)
      if (exists) {
        return prev
      }
      return [...prev, userMessage]
    })
    setInputValue('')
    setIsLoading(true)
    setIsInitialLoad(false) // אחרי שליחת הודעה, זה כבר לא טעינה ראשונית

    try {
      // שליחה ל-AI דרך Supabase Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase לא מוגדר')
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          question: question,
          messageId: userMessageId,
          userId: 'anonymous',
          userName: userName // שליחת השם לשרת
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        // אם ה-IP חסום, הצג הודעה מתאימה
        if (response.status === 403) {
          setMessages(prev => {
            const errorMessageId = `error-${Date.now()}-${Math.random().toString(36).substring(7)}`
            const errorMessage = {
              id: errorMessageId,
              user: 'שוקי הבוט',
              text: errorData.response || 'כתובת ה-IP שלך חסומה מהצאט. אתה יכול לצפות בהודעות אבל לא לכתוב.',
              timestamp: formatTimestamp(),
              timestampDate: new Date(),
              isAI: true,
              replyTo: userMessageId
            }
            const exists = prev.some(msg => msg.id === errorMessageId)
            if (exists) return prev
            const updated = [...prev, errorMessage]
            return updated.sort((a, b) => (a.timestampDate?.getTime() || 0) - (b.timestampDate?.getTime() || 0))
          })
          // הסרת הודעת המשתמש מה-state כי היא לא נשלחה
          setMessages(prev => prev.filter(msg => msg.id !== userMessageId))
          setTimeout(() => scrollToBottom(), 100)
          return
        }
        // אם יש Rate Limit (429), הצג הודעה ועדכן את ה-cooldown timer
        if (response.status === 429) {
          const errorMessageId = `error-${Date.now()}-${Math.random().toString(36).substring(7)}`
          const errorMessage = {
            id: errorMessageId,
            user: 'שוקי הבוט',
            text: errorData.response || 'אנא המתן 60 שניות לפני שליחת הודעה נוספת.',
            timestamp: formatTimestamp(),
            timestampDate: new Date(),
            isAI: true,
            replyTo: userMessageId
          }
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === errorMessageId)
            if (exists) return prev
            const updated = [...prev, errorMessage]
            return updated.sort((a, b) => (a.timestampDate?.getTime() || 0) - (b.timestampDate?.getTime() || 0))
          })
          // חילוץ מספר השניות מההודעה (אם יש)
          const secondsMatch = errorData.response?.match(/(\d+)\s*שניות/)
          if (secondsMatch) {
            const remainingSeconds = parseInt(secondsMatch[1])
            setCooldownTimer(remainingSeconds)
          } else {
            setCooldownTimer(60) // ברירת מחדל 60 שניות
          }
          // הסרת הודעת המשתמש מה-state כי היא לא נשלחה
          setMessages(prev => prev.filter(msg => msg.id !== userMessageId))
          setTimeout(() => scrollToBottom(), 100)
          return
        }
        throw new Error(errorData.error || 'שגיאה בתקשורת עם AI')
      }

      const data = await response.json()
      
      // הוסף את תשובת ה-AI מיד מה-API response
      if (data.response) {
        const aiNow = new Date()
        const aiTimestamp = formatTimestamp(aiNow)
        // יצירת ID ייחודי לתשובת ה-AI
        const aiMessageId = `ai-${Date.now()}-${Math.random().toString(36).substring(7)}`
        
        const aiMessage = {
          id: aiMessageId,
          user: 'AI',
          text: data.response,
          timestamp: aiTimestamp,
          timestampDate: aiNow,
          isAI: true,
          replyTo: userMessageId
        }
        
        setMessages(prev => {
          // בדיקה שההודעה לא קיימת כבר
          const exists = prev.some(msg => 
            msg.isAI && 
            msg.replyTo === userMessageId &&
            Math.abs((msg.timestampDate?.getTime() || 0) - aiNow.getTime()) < 5000 // בתוך 5 שניות
          )
          
          if (exists) {
            return prev
          }
          
          const updated = [...prev, aiMessage]
          // מיון לפי תאריך
          const sorted = updated.sort((a, b) => {
            const timeA = a.timestampDate || new Date(0)
            const timeB = b.timestampDate || new Date(0)
            return timeA.getTime() - timeB.getTime()
          })
          
          return sorted
        })
        
        // גלילה למטה אחרי הוספת התשובה
        setTimeout(() => {
          scrollToBottom()
        }, 200)
      }
      
      // הפעלת טיימר cooldown של 60 שניות
      setCooldownTimer(60)

    } catch (error) {
      const errorTimestamp = formatTimestamp()
      
      // הוסף הודעת שגיאה
      const errorMessageId = `error-${Date.now()}-${Math.random().toString(36).substring(7)}`
      const errorMessage = {
        id: errorMessageId,
        user: 'AI',
        text: 'שים לב שאינך עובר על תקנון השימוש, דבר זה עשוי לגרור חסימה',
        timestamp: errorTimestamp,
        timestampDate: new Date(),
        isAI: true,
        replyTo: userMessageId
      }

      setMessages(prev => {
        // בדיקה שההודעה לא קיימת כבר
        const exists = prev.some(msg => msg.id === errorMessageId)
        if (exists) {
          return prev
        }
        const updated = [...prev, errorMessage]
        return updated.sort((a, b) => {
          const timeA = a.timestampDate || new Date(0)
          const timeB = b.timestampDate || new Date(0)
          return timeA.getTime() - timeB.getTime()
        })
      })
      
      setTimeout(() => scrollToBottom(), 100)
      
      // הפעלת טיימר cooldown של 60 שניות גם במקרה של שגיאה
      setCooldownTimer(60)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`ai-chat-page ${isPreview ? 'preview-mode' : ''}`}>
      {showWelcomeForm && (
        <div className="welcome-form-overlay">
          <div className="welcome-form-container">
            <h2 className="welcome-form-title">ברוכים הבאים לצ'אט Yellow Friday!</h2>
            <p className="welcome-form-subtitle">לפני שנתחיל, אנא מלא את הפרטים הבאים:</p>
            
            <form onSubmit={handleWelcomeSubmit} className="welcome-form">
              <div className="welcome-form-field">
                <label htmlFor="userName" className="welcome-form-label">
                  שם פרטי (בעברית)
                </label>
                <input
                  type="text"
                  id="userName"
                  value={userNameInput}
                  onChange={(e) => {
                    setUserNameInput(e.target.value)
                    setNameError('')
                  }}
                  className={`welcome-form-input ${nameError ? 'error' : ''}`}
                  placeholder="הזן שם פרטי בעברית"
                  dir="rtl"
                  autoFocus
                />
                {nameError && <span className="welcome-form-error">{nameError}</span>}
              </div>

              <div className="welcome-form-field">
                <label className="welcome-form-checkbox-label">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked)
                      setNameError('')
                    }}
                    className="welcome-form-checkbox"
                  />
                  <span className="welcome-form-checkbox-text">
                    אני מאשר/ת את <button type="button" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} className="welcome-form-link-button">תקנון השימוש</button> ומסכים/ה לתנאיו
                  </span>
                </label>
              </div>

              <button type="submit" className="welcome-form-button">
                <FiCheck /> התחל לצ'אט
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal לתקנון המלא */}
      {showTermsModal && (
        <div className="terms-modal-overlay" onClick={() => setShowTermsModal(false)}>
          <div className="terms-modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="terms-modal-close" onClick={() => setShowTermsModal(false)}>×</button>
            <div className="terms-modal-content">
              <h2 className="terms-modal-title">תקנון השימוש בצ'אט</h2>
              <div className="terms-modal-text">
                <p><strong>ברוך הבא למערכת הצ'אט של רשת מחסני השוק.</strong> השימוש במערכת כפוף ומותנה בקריאת התקנון ובהסכמה מלאה לכל סעיפיו.</p>
                
                <p>בשימוש בצ'אט הלקוח מאשר כי קרא, הבין והסכים לכל התנאים שלהלן:</p>
                
                <h3>1. כללי</h3>
                <p>מערכת הצ'אט מופעלת בשילוב טכנולוגיית בינה מלאכותית.</p>
                <p>הצ'אט נועד להענקת מידע כללי בלבד, ואינו מהווה תחליף למידע רשמי המופיע בסניפים, באתר הרשת או בתקנונים רשמיים אחרים של מחסני השוק.</p>
                <p>רשת מחסני השוק שומרת לעצמה את הזכות לעדכן, לשנות או להפסיק את פעילות הצ'אט בכל עת וללא הודעה מוקדמת.</p>
                
                <h3>2. מהות השירות</h3>
                <p>המערכת מספקת מענה אוטומטי אשר עשוי לכלול טעויות, השמטות, אי־דיוקים, ניסוחים שגויים או מידע ישן.</p>
                <p>הלקוח מאשר כי הוא מודע לכך שהתוכן בצ'אט אינו מחייב את הרשת בשום צורה.</p>
                <p>בכל סתירה בין המידע בצ'אט לבין המידע בסניף, באתר הרשמי או בתקנוני הרשת — אך ורק המידע הרשמי הוא הקובע.</p>
                
                <h3>3. אחריות הלקוח</h3>
                <p>כל שימוש במידע המתקבל בצ'אט נעשה על אחריותו הבלעדית של הלקוח.</p>
                <p>הלקוח מצהיר כי לא תהיה לו כל טענה, דרישה או תביעה נגד רשת מחסני השוק, עובדיה, מנהליה או מי מטעמה בגין:</p>
                <ul>
                  <li>מידע שגוי</li>
                  <li>אי־דיוקים</li>
                  <li>טעויות ניסוח</li>
                  <li>מידע חלקי</li>
                  <li>הבנה מוטעית</li>
                  <li>או כל נזק ישיר/עקיף הנובע משימוש בצ'אט</li>
                </ul>
                <p>הלקוח מתחייב לבדוק את המידע הרשמי לפני ביצוע רכישה או החלטה אחרת המבוססת על המידע בצ'אט.</p>
                
                <h3>4. מידע קובע</h3>
                <p>המידע המחייב היחיד הוא זה המפורסם:</p>
                <ul>
                  <li>בסניפי הרשת</li>
                  <li>באתר הרשמי</li>
                  <li>בתקנוני הרשת</li>
                  <li>אצל נציגי שירות מוסמכים</li>
                </ul>
                <p>מחירים, מבצעים, שעות פעילות, זמינות מוצרים, מלאי, הנחות או הטבות — יחשבו מחייבים רק כפי שמופיעים רשמית בסניף.</p>
                
                <h3>5. התנהלות משתמש במערכת</h3>
                <p>המשתמש מתחייב לא לפרסם, לשלוח או להזין בצ'אט כל תוכן המהווה:</p>
                <ul>
                  <li>לשון הרע</li>
                  <li>הטרדה</li>
                  <li>פגיעה בפרטיות</li>
                  <li>קללות, שפה פוגענית או גזענות</li>
                  <li>מידע שקרי, מטעה או בלתי חוקי</li>
                  <li>פרסום מסחרי אסור</li>
                  <li>סקריפטים, קודים או נסיונות פגיעה במערכת</li>
                </ul>
                <p>לא להתחזה לאחר.</p>
                <p>לא לנסות לעקוף הגנות או חסימות.</p>
                
                <h3>6. חסימות והגבלות</h3>
                <p>מחסני השוק רשאית לחסום משתמש בכל עת ללא צורך בנימוק או הודעה מוקדמת, לרבות במקרים של:</p>
                <ul>
                  <li>שימוש לא ראוי</li>
                  <li>העלאת תוכן אסור</li>
                  <li>ניסיון פגיעה במערכת</li>
                  <li>התנהגות מאיימת או פוגענית</li>
                </ul>
                <p>חסימת משתמש לא תחשיב כהפרה מצד הרשת, ולא יעמדו למשתמש טענות או דרישות כלפיה.</p>
                
                <h3>7. הגבלת אחריות</h3>
                <p>מחסני השוק אינה אחראית לכל נזק שייגרם עקב שימוש בצ'אט, לרבות נזק עקיף, תוצאתי, כספי, תפעולי או רגשי.</p>
                <p>המערכת ניתנת "כפי שהיא" (As-Is) ללא אחריות לביצועיה, זמינותה או דיוק מידע.</p>
                <p>אין כל התחייבות שהמידע בצ'אט יהיה מעודכן בזמן אמת.</p>
                
                <h3>8. פרטיות ואבטחת מידע</h3>
                <p>כל שיחה בצ'אט עשויה להישמר לצרכי תפעול, שיפור המערכת ושמירה על בטחון המשתמשים.</p>
                <p>מחסני השוק רשאית לשמור נתונים לצורך הגנה מפני שימוש לרעה או לצורך תפעולי.</p>
                <p>שימוש בצ'אט מהווה הסכמה למדיניות הפרטיות של הרשת.</p>
                
                <h3>9. קניין רוחני</h3>
                <p>כל הזכויות במערכת, בעיצוב, בתכנים ובטכנולוגיה — שמורות למחסני השוק בלבד.</p>
                
                <h3>10. תנאים כלליים</h3>
                <p>התקנון מנוסח בלשון זכר אך מתייחס לכל המגדרים.</p>
                <p>מחסני השוק רשאית לעדכן את התקנון מעת לעת.</p>
                <p>המשך שימוש בצ'אט מהווה הסכמה לתקנון המעודכן.</p>
                
                <h3>11. הצהרת המשתמש</h3>
                <p>באישור הצ'קבוקס המשתמש מצהיר כי:</p>
                <ul>
                  <li>קרא והבין את כל התנאים</li>
                  <li>מסכים לכל הסעיפים</li>
                  <li>יודע שהמידע בצ'אט אינו מחייב</li>
                  <li>האחריות עליו בלבד</li>
                  <li>המידע הרשמי בסניפים/אתר הוא הקובע</li>
                  <li>הוא עלול להיחסם בכל עת עקב שימוש לא ראוי</li>
                  <li>לא תהיה לו כל טענה או תביעה כלפי מחסני השוק</li>
                </ul>
              </div>
              <button className="terms-modal-close-button" onClick={() => setShowTermsModal(false)}>סגור</button>
            </div>
          </div>
        </div>
      )}
      
      <div className="ai-chat-container">
        <div className="connected-users-pill">
          <span className="connected-users-dot"></span>
          {connectedUsersCount} לקוחות מחוברים
        </div>
        <div className="ai-chat-header">
          <img 
            src="https://kzznwndtlkbgiavgqjgp.supabase.co/storage/v1/object/public/announcement-images/announcements/CHAT%20LOGO%20(1).png" 
            alt="Yellow Friday Chat Logo" 
            className="chat-logo"
          />
        </div>

        <div className="chat-messages" ref={messagesContainerRef}>
          {isLoadingMore && (
            <div className="load-more-indicator">
              <div className="loading-spinner-small"></div>
              <span>טוען הודעות קודמות...</span>
            </div>
          )}
          {messages.map((message) => {
            const repliedMessage = message.replyTo 
              ? messages.find(m => m.id === message.replyTo)
              : null

            return (
              <div
                key={message.id}
                className={`message-container ${message.isAI ? 'ai-message' : 'user-message'} ${message.isAnnouncement ? 'announcement-message' : ''}`}
              >
                        <div className="message-avatar">
                          {message.isAI ? (
                            <div className={`avatar-ai ${message.isAnnouncement ? 'avatar-announcement' : ''}`}>
                              <img 
                                src="https://kzznwndtlkbgiavgqjgp.supabase.co/storage/v1/object/public/announcement-images/announcements/botpro.png" 
                                alt="שוקי הבוט" 
                                className="avatar-ai-image"
                              />
                            </div>
                          ) : (
                            <div className="avatar-user">
                              <FiUser />
                            </div>
                          )}
                        </div>
                <div className="message-content-wrapper">
                  {message.isAI && repliedMessage && !message.isAnnouncement && (
                    <div className="reply-reference">
                      <div className="reply-line"></div>
                      <div className="reply-question">
                        <span className="reply-user-name">{repliedMessage.user}</span>
                        <span className="reply-text">{repliedMessage.text}</span>
                      </div>
                    </div>
                  )}
                  <div className="message-header">
                    <span className="message-user">{message.user}</span>
                    <span className="message-time">{message.timestamp}</span>
                  </div>
                  <div className="message-content">
                    {message.isAnnouncement && message.announcement?.image_url && (
                      <img 
                        src={message.announcement.image_url} 
                        alt={message.announcement.title || 'הודעה'} 
                        className="announcement-image-inline" 
                      />
                    )}
                    {message.isAnnouncement && message.announcement?.title && (
                      <div className="announcement-title-inline">{message.announcement.title}</div>
                    )}
                    {message.text}
                    {message.isAnnouncement && message.announcement?.link_url && (
                      <div style={{ marginTop: '10px' }}>
                        <a 
                          href={message.announcement.link_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="announcement-link-inline"
                        >
                          {message.announcement.link_text || message.announcement.link_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {!isPreview && (
          <form className="chat-input-form" onSubmit={handleSend}>
            {inputError && (
              <div className="chat-input-error">
                {inputError}
              </div>
            )}
            <div className="input-container">
              <textarea
                className={`chat-input ${inputError ? 'error' : ''}`}
                placeholder="שאל שאלה על Yellow Friday..."
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  setInputError('') // ניקוי שגיאה בזמן הקלדה
                }}
                dir="rtl"
                rows={1}
                onInput={(e) => {
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
              />
              <div className="input-actions">
                <button 
                  type="submit" 
                  className="chat-send-button" 
                  disabled={!inputValue.trim() || isLoading || cooldownTimer > 0}
                  title={cooldownTimer > 0 ? `נא להמתין ${cooldownTimer} שניות לפני שליחת הודעה נוספת` : ''}
                >
                  {isLoading ? (
                    <div className="loading-spinner-small"></div>
                  ) : cooldownTimer > 0 ? (
                    <span className="cooldown-timer">{cooldownTimer}</span>
                  ) : (
                    <FiSend className="send-icon" />
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default AIChat

