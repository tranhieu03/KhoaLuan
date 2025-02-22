import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getProductsByRestaurant } from "../services/customerService";

function ProductsByRestaurant() {
  const { restaurantId } = useParams(); // Lấy restaurantId từ URL
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProductsByRestaurant(restaurantId);
        setProducts(data || []);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError(err.response?.data?.message || "Failed to fetch products.");
      }
    };
    fetchProducts();
  }, [restaurantId]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Products by Restaurant</h1>
      <div>
        {products.length > 0 ? (
          products.map((product) => (
            <div key={product.productId} style={{ border: "1px solid #ddd", padding: "10px", margin: "10px" }}>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  style={{ width: "150px", height: "150px", objectFit: "cover" }}
                />
              ) : (
                <p>No image available</p>
              )}
              <p>Price: ${product.price}</p>
              <p>Quantity: {product.stockQuantity}</p>
              
            </div>
          ))
        ) : (
          <p>No products found for this restaurant.</p>
        )}
      </div>
    </div>
  );
}

export default ProductsByRestaurant;
