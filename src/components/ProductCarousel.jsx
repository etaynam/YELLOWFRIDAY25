import { FiEye } from 'react-icons/fi'
import './ProductCarousel.css'

function ProductCarousel({ openForm }) {
  const products = [
    '/ex-01.png',
    '/ex-02.png',
    '/ex-03.png',
    '/ex-04.png',
    '/ex-05.png',
    '/ex-06.png'
  ]

  return (
    <div className="product-carousel-container">
      <div className="product-carousel">
        {products.map((product, index) => (
          <div 
            key={index} 
            className="product-item"
            onClick={() => {
              if (openForm) {
                openForm()
              }
            }}
          >
            <img
              src={product}
              alt={`מוצר ${index + 1}`}
              className="product-image"
            />
            <div className="product-overlay">
              <FiEye className="reveal-icon" />
              <span className="coming-soon-text">לחץ לגילוי המבצע</span>
            </div>
            <div className="reveal-overlay">
              <span className="reveal-text">לחץ כאן לחשיפת מבצע זה</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProductCarousel

