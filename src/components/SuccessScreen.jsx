import './SuccessScreen.css'

function SuccessScreen({ revealedImage, onClose }) {
  const whatsappLink = 'https://bit.ly/3AzMjD0'

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

