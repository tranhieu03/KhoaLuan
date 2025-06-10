import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import Header from './Header';
import API_BASE_URL from "../config";


const API_ORDERS = `${API_BASE_URL}/Review`;

function ReviewOrder() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [deliveryReview, setDeliveryReview] = useState({
    rating: 5,
    comment: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [allProductsReviewed, setAllProductsReviewed] = useState(false);

  useEffect(() => {
    fetchUnreviewedProducts();
  }, [orderId]);

  const fetchUnreviewedProducts = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${API_ORDERS}/unreviewed-products/${orderId}`,
        { withCredentials: true }
      );
      
      if (response.status === 200) {
        setProducts(response.data.map(product => ({
            ...product,
            review: { rating: 0, comment: '' } // Thay vì mặc định 5 sao, để 0 sao ban đầu
          })));
      }
    } catch (error) {
      console.error("Lỗi khi lấy sản phẩm chưa đánh giá:", error);
      setError("Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductReviewChange = (orderDetailId, field, value) => {
    setProducts(products.map(product => 
      product.orderDetailId === orderDetailId
        ? { 
            ...product, 
            review: { 
              ...product.review, 
              [field]: field === 'rating' ? Number(value) : value 
            } 
          }
        : product
    ));
  };

  const submitProductReview = async (orderDetailId) => {
    const product = products.find(p => p.orderDetailId === orderDetailId);
    if (!product || product.review.rating === 0) { // Thay đổi điều kiện kiểm tra
      setNotification({
        type: "error",
        message: "Vui lòng chọn số sao đánh giá (từ 1 đến 5 sao)"
      });
      return;
    }
    try {
        setIsLoading(true);
        const response = await axios.post(
          `${API_ORDERS}/ReviewProduct`,
          {
            OrderDetailId: orderDetailId,
            Rating: product.review.rating,
            Comment: product.review.comment
          },
          { withCredentials: true }
        );
    
        if (response.status === 200) {
          setNotification({
            type: "success",
            message: "Đánh giá sản phẩm thành công!"
          });
          setAllProductsReviewed(response.data.allProductsReviewed);
          setProducts(products.filter(p => p.orderDetailId !== orderDetailId));
        }
      } catch (error) {
        console.error("Lỗi khi đánh giá sản phẩm:", error);
        setNotification({
          type: "error",
          message: error.response?.data?.message || "Đánh giá thất bại. Vui lòng thử lại."
        });
      } finally {
        setIsLoading(false);
      }
  };

  const handleDeliveryReviewChange = (field, value) => {
    setDeliveryReview({
      ...deliveryReview,
      [field]: value
    });
  };

  const submitDeliveryReview = async () => {
    if (!deliveryReview.rating) {
      setNotification({
        type: "error",
        message: "Vui lòng chọn số sao đánh giá tài xế"
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(
        `${API_ORDERS}/ReviewDelivery`,
        {
          OrderId: parseInt(orderId),
          Rating: deliveryReview.rating,
          Comment: deliveryReview.comment
        },
        { withCredentials: true }
      );

      if (response.status === 200) {
        setNotification({
          type: "success",
          message: "Đánh giá tài xế thành công!"
        });
        // Chuyển hướng về trang đơn hàng sau 2 giây
        setTimeout(() => {
          navigate('/customer/order');
        }, 2000);
      }
    } catch (error) {
      console.error("Lỗi khi đánh giá tài xế:", error);
      setNotification({
        type: "error",
        message: error.response?.data?.message || "Đánh giá thất bại. Vui lòng thử lại."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const dismissNotification = () => {
    setNotification(null);
  };

  if (isLoading && products.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Header />
      
      {notification && (
        <div className={`mb-6 p-4 rounded-md border ${
          notification.type === "success" ? "bg-green-50 border-green-500 text-green-700" : "bg-red-50 border-red-500 text-red-700"
        }`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {notification.type === "success" ? (
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {notification.message}
            </div>
            <button onClick={dismissNotification} className="text-gray-500 hover:text-gray-700">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Đánh giá đơn hàng #{orderId}</h1>
        
        {/* Đánh giá sản phẩm */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Đánh giá sản phẩm</h2>
            <p className="text-gray-600 mb-6">Vui lòng đánh giá các sản phẩm bạn đã nhận được</p>
            
            <div className="space-y-6">
            {products.map((product) => (
  <div key={product.orderDetailId} className="border-b border-gray-200 pb-6 last:border-b-0">
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-shrink-0">
        <img 
          src={product.productImage || '/placeholder-product.jpg'} 
          alt={product.productName}
          className="w-20 h-20 object-cover rounded-md"
        />
      </div>
      <div className="flex-grow">
        <h3 className="font-medium text-gray-800">{product.productName}</h3>
        <p className="text-sm text-gray-600">
          {product.quantity} x {product.price.toLocaleString('vi-VN')}đ
        </p>
        
        {/* Phần đánh giá sao và comment */}
        <div className="mt-3">
        <div className="flex items-center mb-2">
  <span className="mr-2 text-sm font-medium text-gray-700">Chất lượng:</span>
  {[1, 2, 3, 4, 5].map((star) => (
    <button
      key={star}
      type="button"
      onClick={() => handleProductReviewChange(product.orderDetailId, 'rating', star)}
      className={`text-2xl ${product.review.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
    >
      ★
    </button>
  ))}
  {product.review.rating > 0 && (
    <span className="ml-2 text-sm text-gray-600">
      ({product.review.rating} sao)
    </span>
  )}
</div>
          
          <textarea
            value={product.review.comment}
            onChange={(e) => handleProductReviewChange(product.orderDetailId, 'comment', e.target.value)}
            placeholder="Nhận xét về sản phẩm này (không bắt buộc)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="2"
          />
        </div>
        
        <div className="mt-3">
          <button
            onClick={() => submitProductReview(product.orderDetailId)}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            )}
            Gửi đánh giá
          </button>
        </div>
      </div>
    </div>
  </div>
))}
            </div>
          </div>
        )}
        
        {/* Đánh giá tài xế (chỉ hiển thị khi đã đánh giá hết sản phẩm) */}
        {allProductsReviewed && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Đánh giá tài xế</h2>
            <p className="text-gray-600 mb-6">Vui lòng đánh giá chất lượng dịch vụ giao hàng</p>
            
            <div className="flex items-center mb-4">
              <span className="mr-2 text-sm font-medium text-gray-700">Đánh giá:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleDeliveryReviewChange('rating', star)}
                  className={`text-2xl ${deliveryReview.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
            
            <textarea
              value={deliveryReview.comment}
              onChange={(e) => handleDeliveryReviewChange('comment', e.target.value)}
              placeholder="Nhận xét về tài xế (không bắt buộc)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows="3"
            />
            
            <button
              onClick={submitDeliveryReview}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              )}
              Hoàn thành đánh giá
            </button>
          </div>
        )}
        
        {/* Hiển thị khi đã đánh giá hết */}
        {products.length === 0 && !allProductsReviewed && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Bạn đã hoàn thành đánh giá sản phẩm</h3>
            <p className="mt-1 text-sm text-gray-500">
              Vui lòng đánh giá tài xế để hoàn tất quá trình
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewOrder;