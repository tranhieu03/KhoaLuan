import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import API_BASE_URL from "../config";

export default function PaymentResult() {
  const [paymentInfo, setPaymentInfo] = useState({
    success: false,
    message: '',
    orderId: null,
    amount: 0,
    transactionId: '',
    bankCode: '',
    paymentTime: ''
  });

  useEffect(() => {
    // Get information from VNPay URL parameters
    const params = new URLSearchParams(window.location.search);
    
    // Check VNPay response code
    const responseCode = params.get('vnp_ResponseCode');
    const isSuccess = responseCode === '00';
    
    // Get transaction details
    const orderId = params.get('vnp_TxnRef');
    const amount = params.get('vnp_Amount') ? Number(params.get('vnp_Amount')) / 100 : 0;
    const transactionId = params.get('vnp_TransactionNo') || '';
    const bankCode = params.get('vnp_BankCode') || '';
    const paymentTime = params.get('vnp_PayDate') || '';
    
    // Format payment time if available (format: yyyyMMddHHmmss)
    let formattedTime = '';
    if (paymentTime && paymentTime.length === 14) {
      formattedTime = `${paymentTime.substring(6, 8)}/${paymentTime.substring(4, 6)}/${paymentTime.substring(0, 4)} ${paymentTime.substring(8, 10)}:${paymentTime.substring(10, 12)}:${paymentTime.substring(12, 14)}`;
    }

    // Set payment info - LUÔN HIỂN THỊ THÀNH CÔNG KHI CÓ MÃ 00
    setPaymentInfo({
      success: isSuccess,
      message: isSuccess 
        ? 'Thanh toán thành công qua VNPay' 
        : params.get('message') || `Thanh toán thất bại. Mã lỗi: ${responseCode || 'unknown'}`,
      orderId: orderId ? Number(orderId) : null,
      amount: amount,
      transactionId: transactionId,
      bankCode: bankCode,
      paymentTime: formattedTime
    });

    // Confirm payment with backend if success
    if (isSuccess && orderId) {
      confirmPaymentWithBackend(orderId, transactionId);
    }
  }, []);

  const confirmPaymentWithBackend = async (orderId, transactionId) => {
    try {
      const response = await fetch(`/api/payment/confirm?orderId=${orderId}&transactionId=${transactionId}`);
      if (!response.ok) {
        console.error('Failed to confirm payment with backend');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(amount);
  };

  const goToOrderDetail = () => {
    if (paymentInfo.orderId) {
      window.location.href = `/order-details/${paymentInfo.orderId}`;
    } else {
      window.location.href = '/all';
    }
  };

  const goToHomePage = () => {
    window.location.href = '/all';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-md p-6">
        {/* Header with icon - LUÔN HIỂN THỊ THÀNH CÔNG KHI CÓ MÃ 00 */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-green-100 p-3 rounded-full mb-4">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-center">
            Thanh toán thành công
          </h1>
        </div>

        {/* Details */}
        <div className="mb-6 border-t border-b border-gray-200 py-4">
          <p className="text-gray-700 mb-4 text-center">
            {paymentInfo.message}
          </p>
          
          {paymentInfo.orderId && (
            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <p className="text-gray-500">Mã đơn hàng:</p>
              <p className="font-semibold">{paymentInfo.orderId}</p>
            </div>
          )}
          
          {paymentInfo.amount > 0 && (
            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <p className="text-gray-500">Số tiền:</p>
              <p className="font-semibold">{formatCurrency(paymentInfo.amount)}</p>
            </div>
          )}
          
          {paymentInfo.transactionId && (
            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <p className="text-gray-500">Mã giao dịch:</p>
              <p className="font-semibold">{paymentInfo.transactionId}</p>
            </div>
          )}
          
          {paymentInfo.bankCode && (
            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <p className="text-gray-500">Ngân hàng:</p>
              <p className="font-semibold">{paymentInfo.bankCode}</p>
            </div>
          )}
          
          {paymentInfo.paymentTime && (
            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <p className="text-gray-500">Thời gian:</p>
              <p className="font-semibold">{paymentInfo.paymentTime}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-3">
          {paymentInfo.orderId ? (
            <button 
              onClick={goToOrderDetail}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
            >
              Xem chi tiết đơn hàng
            </button>
          ) : null}
          
          <button 
            onClick={goToHomePage}
            className="w-full py-2 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-md flex items-center justify-center"
          >
            <ArrowLeft size={16} className="mr-2" />
            Về trang chủ
          </button>
        </div>

        <div className="mt-6 p-3 bg-blue-50 rounded-md flex items-start">
          <AlertCircle size={20} className="text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            Cảm ơn bạn đã sử dụng dịch vụ. Đơn hàng của bạn đã được thanh toán thành công và đang được xử lý.
          </p>
        </div>
      </div>
    </div>
  );
}