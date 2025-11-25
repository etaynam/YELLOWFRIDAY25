import { FiEye } from 'react-icons/fi'
import './SingleProductBox.css'

function SingleProductBox({ openForm }) {
  return (
    <div className="single-product-box-container">
      <div 
        className="single-product-box"
        onClick={() => {
          if (openForm) {
            openForm()
          }
        }}
      >
        <div className="single-product-content">
          <div className="single-product-icon">
            <FiEye className="reveal-icon-large" />
          </div>
          <h2 className="single-product-title">לחשיפת המבצע לחצו כאן</h2>
          <div className="single-product-overlay">
            <span className="reveal-text">לחץ כאן לחשיפת המבצע</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SingleProductBox

