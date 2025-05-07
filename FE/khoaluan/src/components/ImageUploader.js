import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

const ImageUploader = ({ value, onChange, productId }) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(value || null);

  const handleClick = () => {
    // Kích hoạt sự kiện click trên input file ẩn
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Kiểm tra xem file có phải là ảnh không
    if (!file.type.match('image.*')) {
      alert('Vui lòng chọn file ảnh');
      return;
    }

    // Đọc file và chuyển thành URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target.result;
      setPreview(imageData);
      onChange(imageData, productId);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div 
      className="relative w-full h-full rounded-md overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer"
      onClick={handleClick}
    >
      {preview ? (
        <img 
          src={preview} 
          alt="Product" 
          className="w-full h-full object-cover" 
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-2">
          <ImageIcon className="w-8 h-8 text-gray-400" />
          <span className="text-xs text-gray-500 mt-1">Tải ảnh lên</span>
        </div>
      )}
      
      {/* Input file ẩn */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      {/* Overlay khi hover */}
      <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
        <Upload className="w-6 h-6 text-white" />
      </div>
    </div>
  );
};

export default ImageUploader;