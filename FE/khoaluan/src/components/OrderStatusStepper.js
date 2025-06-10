import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import API_BASE_URL from "../config";

const OrderStatusStepper = ({ currentStatus, orderDate, estimatedDelivery }) => {
  const statuses = [
    { id: 'pending', label: 'Đã đặt hàng' },
    { id: 'readyfordelivery', label: 'Đang chuẩn bị' },
    { id: 'indelivery', label: 'Đang giao' },
    { id: 'completed', label: 'Hoàn thành' }
  ];

  // Đảm bảo currentStatus được chuyển thành chữ thường để so sánh chính xác
  // Thêm kiểm tra để tránh lỗi khi currentStatus là undefined hoặc null
  const normalizedStatus = currentStatus ? currentStatus.toLowerCase() : '';
  const currentIndex = statuses.findIndex(s => s.id === normalizedStatus);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="relative">
        {/* Progress line */}
        <div className="absolute top-4 left-4 right-4 h-1 bg-gray-200">
          <div 
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ 
              width: currentIndex >= 0 ? `${(currentIndex / (statuses.length - 1)) * 100}%` : '0%'
            }}
          ></div>
        </div>
        
        {/* Steps */}
        <div className="flex justify-between relative z-10">
          {statuses.map((status, index) => {
            // Trạng thái hoàn thành khi index nhỏ hơn currentIndex
            const isCompleted = index < currentIndex;
            // Trạng thái hiện tại
            const isCurrent = index === currentIndex;
            // Trạng thái chưa đạt được
            const isPending = index > currentIndex;
            
            return (
              <div key={status.id} className="flex flex-col items-center w-1/4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                  isCompleted ? 'bg-blue-500 text-white' : 
                  isCurrent ? 'bg-blue-500 text-white' : 
                  'bg-gray-200 text-gray-500'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : isCurrent ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  )}
                </div>
                <span className={`text-xs text-center ${isCurrent ? 'font-semibold text-blue-600' : isPending ? 'text-gray-500' : 'text-gray-700'}`}>
                  {status.label}
                </span>
                {index === 0 && orderDate && (
                  <span className="text-xs text-gray-400 mt-1 text-center">
                    {new Date(orderDate).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                  </span>
                )}
                {index === statuses.length - 1 && estimatedDelivery && (
                  <span className="text-xs text-gray-400 mt-1 text-center">
                    {new Date(estimatedDelivery).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderStatusStepper;