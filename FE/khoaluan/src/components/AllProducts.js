import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllProducts } from "../services/customerService";
import { addToCart } from "../services/cartService";

function AllProducts() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalProducts, setTotalProducts] = useState(0);
  const [cartMessage, setCartMessage] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getAllProducts(page, pageSize);
        setProducts(data.products || []);
        setTotalProducts(data.totalProducts || 0);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };
    fetchProducts();
  }, [page, pageSize]);

  const handleNextPage = () => {
    if (page < Math.ceil(totalProducts / pageSize)) setPage(page + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const navigateToRestaurant = (restaurantId) => {
    navigate(`/restaurant/${restaurantId}`);
  };

  const handleAddToCart = async (productId) => {
    try {
      await addToCart(productId, 1); // Add 1 product to cart
      setCartMessage({ type: "success", text: "Product added to cart successfully!" });
      setTimeout(() => setCartMessage(null), 3000);
    } catch (err) {
      console.error("Error adding product to cart:", err);
      setCartMessage({ type: "error", text: "Failed to add product to cart. Please try again." });
      setTimeout(() => setCartMessage(null), 3000);
    }
  };

  return (
    <div className="all-products-container">
      <h1>All Products</h1>
      {cartMessage && (
        <div className={`cart-message ${cartMessage.type}`}>
          {cartMessage.text}
        </div>
      )}
      <div className="product-list">
        {products.length > 0 ? (
          products.map((product) => (
            <div key={product.productId} className="product-item">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="product-image"
              />
              <h3 className="product-name">{product.name}</h3>
              <p className="product-description">{product.description}</p>
              <p className="product-price">Price: ${product.price.toFixed(2)}</p>
              <p className="product-restaurant">
                Restaurant: {product.restaurantName || "N/A"}
              </p>
              <button
                className="restaurant-button"
                onClick={() => navigateToRestaurant(product.restaurantId)}
              >
                Visit Restaurant
              </button>
              <button
                className="add-to-cart-button"
                onClick={() => handleAddToCart(product.productId)}
              >
                Add to Cart
              </button>
            </div>
          ))
        ) : (
          <p>No products available.</p>
        )}
      </div>
      <div className="pagination-buttons">
        <button onClick={handlePrevPage} disabled={page === 1}>
          Previous
        </button>
        <button
          onClick={handleNextPage}
          disabled={page >= Math.ceil(totalProducts / pageSize)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default AllProducts;
