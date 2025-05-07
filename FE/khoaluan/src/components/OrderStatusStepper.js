import React from 'react';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

const OrderStatusStepper = ({ currentStatus, orderDate, estimatedDelivery }) => {
  const statuses = [
    { id: 'Pending', label: 'Đã đặt hàng' },
    { id: 'ReadyForDelivery', label: 'Đang chuẩn bị' },
    { id: 'InDelivery', label: 'Đang giao' },
    { id: 'completed', label: 'Hoàn thành' }
  ];

  const currentIndex = statuses.findIndex(s => s.id === currentStatus.toLowerCase());

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="relative">
        {/* Progress line */}
        <div className="absolute top-4 left-4 right-4 h-1 bg-gray-200">
          <div 
            className={`h-full bg-blue-500 transition-all duration-500`}
            style={{ 
              width: `${(currentIndex / (statuses.length - 1)) * 100}%` 
            }}
          ></div>
        </div>
        
        {/* Steps */}
        <div className="flex justify-between relative z-10">
          {statuses.map((status, index) => {
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            
            return (
              <div key={status.id} className="flex flex-col items-center w-1/4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                  isCompleted ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : isCurrent ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  )}
                </div>
                <span className={`text-xs text-center ${isCurrent ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                  {status.label}
                </span>
                {index === 0 && (
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