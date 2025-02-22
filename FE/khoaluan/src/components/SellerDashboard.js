import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "https://localhost:44308/api/Product";

function SellerDashboard() {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    stockQuantity: ""
  });
  const [message, setMessage] = useState("");

  // Lấy danh sách sản phẩm khi tải trang
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/listsanphamcuahang`, { withCredentials: true });
      setProducts(response.data);
    } catch (error) {
      setMessage("Không thể tải danh sách sản phẩm.");
    }
  };

  // Xử lý form nhập liệu
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewProduct((prev) => ({ ...prev, [name]: value }));
  };

  // Xử lý thêm sản phẩm mới
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/create`, newProduct, { withCredentials: true });
      setMessage(response.data.message);
      fetchProducts(); // Refresh danh sách sản phẩm
    } catch (error) {
      setMessage(error.response?.data?.message || "Lỗi khi thêm sản phẩm.");
    }
  };

  return (
    <div className="container">
      <h1>Seller Dashboard</h1>
      
      {/* Thông báo */}
      {message && <p>{message}</p>}

      {/* Form thêm sản phẩm */}
      <h2>Thêm Sản Phẩm</h2>
      <form onSubmit={handleCreateProduct}>
        <input type="text" name="name" placeholder="Tên sản phẩm" value={newProduct.name} onChange={handleChange} required />
        <input type="text" name="description" placeholder="Mô tả" value={newProduct.description} onChange={handleChange} required />
        <input type="number" name="price" placeholder="Giá" value={newProduct.price} onChange={handleChange} required />
        <input type="text" name="imageUrl" placeholder="URL Ảnh (tuỳ chọn)" value={newProduct.imageUrl} onChange={handleChange} />
        <input type="number" name="stockQuantity" placeholder="Số lượng tồn kho" value={newProduct.stockQuantity} onChange={handleChange} required />
        <button type="submit">Thêm Sản Phẩm</button>
      </form>

      {/* Danh sách sản phẩm */}
      <h2>Danh Sách Sản Phẩm</h2>
      <ul>
        {products.map((product) => (
          <li key={product.productId}>
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <p>Giá: {product.price}₫</p>
            <p>Số lượng: {product.stockQuantity}</p>
            {product.imageUrl && <img src={product.imageUrl} alt={product.name} width="100" />}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SellerDashboard;
