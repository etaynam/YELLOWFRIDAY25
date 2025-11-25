import { useRef, useState } from 'react'
import './App.css'
import CountdownTimer from './components/CountdownTimer'
import SecretDealsStrip from './components/SecretDealsStrip'
import SingleProductBox from './components/SingleProductBox'
import SuccessScreen from './components/SuccessScreen'

function AppVariant() {
  // תאריך יעד - שנה את התאריך לפי הצורך
  const targetDate = '2025-11-29T00:00:00'
  const formRef = useRef(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [revealedImage, setRevealedImage] = useState(null)

  const [formSubmissionId, setFormSubmissionId] = useState(null)

  const handleFormSuccess = (imagePath, submissionId) => {
    setRevealedImage(imagePath)
    setFormSubmissionId(submissionId)
    setShowSuccess(true)
  }

  if (showSuccess) {
    return <SuccessScreen revealedImage={revealedImage} formSubmissionId={formSubmissionId} onClose={() => setShowSuccess(false)} />
  }

  return (
    <div className="App">
      <SecretDealsStrip ref={formRef} onSuccess={handleFormSuccess} />
      <img src="/logo.png" alt="Yellow Friday Logo" className="logo" />
      <CountdownTimer targetDate={targetDate} />
      <SingleProductBox openForm={() => formRef.current?.openForm()} />
      <img src="/logooo.png" alt="מחסני השוק" className="store-logo" />
    </div>
  )
}

export default AppVariant

