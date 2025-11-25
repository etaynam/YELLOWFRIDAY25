import { useState, useEffect } from 'react'
import './FAQDisplay.css'
import FAQ_DATA from '../data/faq-data.json'

function FAQDisplay() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false)
      
      // After fade out, change content and fade in
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % FAQ_DATA.length)
        setIsVisible(true)
      }, 500) // Half of transition duration
    }, 8000) // Show each Q&A for 8 seconds

    return () => clearInterval(interval)
  }, [])

  const currentFAQ = FAQ_DATA[currentIndex]

  return (
    <div className="faq-display-page">
      <div className="faq-logo-container">
        <img 
          src="/logo.png" 
          alt="Yellow Friday Logo" 
          className="faq-logo"
        />
      </div>
      
      <div className={`faq-content ${isVisible ? 'visible' : 'hidden'}`}>
        <div className="faq-question">
          {currentFAQ.question}
        </div>
        {currentFAQ.name && currentFAQ.city && (
          <div className="faq-author">
            {currentFAQ.name}, {currentFAQ.city}
          </div>
        )}
        <div className="faq-answer">
          {currentFAQ.answer}
        </div>
      </div>
    </div>
  )
}

export default FAQDisplay

