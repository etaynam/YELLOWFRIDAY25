import { useState, useEffect } from 'react'
import './CountdownTimer.css'

function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const target = new Date(targetDate).getTime()
      const difference = target - now

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        })
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  const formatNumber = (num) => {
    return num.toString().padStart(2, '0')
  }

  return (
    <div className="countdown-wrapper">
      <div className="countdown-text">היום הגדול ביותר בשנה מתחיל בעוד</div>
      <div className="countdown-timer">
        <div className="timer-item">
          <div className="timer-value">{formatNumber(timeLeft.days)}</div>
          <div className="timer-label">ימים</div>
        </div>
        <span className="timer-separator">:</span>
        <div className="timer-item">
          <div className="timer-value">{formatNumber(timeLeft.hours)}</div>
          <div className="timer-label">שעות</div>
        </div>
        <span className="timer-separator">:</span>
        <div className="timer-item minutes">
          <div className="timer-value">{formatNumber(timeLeft.minutes)}</div>
          <div className="timer-label">דקות</div>
        </div>
        <span className="timer-separator">:</span>
        <div className="timer-item seconds">
          <div className="timer-value">{formatNumber(timeLeft.seconds)}</div>
          <div className="timer-label">שניות</div>
        </div>
      </div>
    </div>
  )
}

export default CountdownTimer

