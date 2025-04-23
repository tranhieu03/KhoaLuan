import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin, Heart } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 transition-colors duration-300">
      {/* Top section with info */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-white p-2 rounded-full">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  F
                </div>
              </div>
              <span className="text-xl font-bold">FoodDelight</span>
            </div>
            <p className="text-sm text-white/80 mb-4">
              FoodDelight là nền tảng đặt món ăn trực tuyến hàng đầu, mang đến trải nghiệm ẩm thực tuyệt vời với đa dạng lựa chọn từ các nhà hàng chất lượng.
            </p>
            <div className="flex space-x-4">
              <a href="https://facebook.com" className="hover:text-yellow-200 transition-colors">
                <Facebook size={20} />
              </a>
              <a href="https://twitter.com" className="hover:text-yellow-200 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="https://instagram.com" className="hover:text-yellow-200 transition-colors">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4 border-b border-white/20 pb-2">Liên kết nhanh</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/all" className="text-white/80 hover:text-yellow-200 transition-colors">Trang chủ</Link>
              </li>
              <li>
                <Link to="/about" className="text-white/80 hover:text-yellow-200 transition-colors">Về chúng tôi</Link>
              </li>
              <li>
                <Link to="/restaurants" className="text-white/80 hover:text-yellow-200 transition-colors">Nhà hàng</Link>
              </li>
              <li>
                <Link to="/promotions" className="text-white/80 hover:text-yellow-200 transition-colors">Khuyến mãi</Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/80 hover:text-yellow-200 transition-colors">Liên hệ</Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-lg mb-4 border-b border-white/20 pb-2">Danh mục món ăn</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/category/fast-food" className="text-white/80 hover:text-yellow-200 transition-colors">Đồ ăn nhanh</Link>
              </li>
              <li>
                <Link to="/category/vietnamese" className="text-white/80 hover:text-yellow-200 transition-colors">Món Việt Nam</Link>
              </li>
              <li>
                <Link to="/category/japanese" className="text-white/80 hover:text-yellow-200 transition-colors">Món Nhật Bản</Link>
              </li>
              <li>
                <Link to="/category/drinks" className="text-white/80 hover:text-yellow-200 transition-colors">Đồ uống</Link>
              </li>
              <li>
                <Link to="/category/desserts" className="text-white/80 hover:text-yellow-200 transition-colors">Tráng miệng</Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-lg mb-4 border-b border-white/20 pb-2">Thông tin liên hệ</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <MapPin size={18} className="mt-1 flex-shrink-0" />
                <span className="text-white/80">123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone size={18} className="flex-shrink-0" />
                <span className="text-white/80">+84 123 456 789</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail size={18} className="flex-shrink-0" />
                <span className="text-white/80">support@fooddelight.com</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Newsletter */}
      <div className="bg-white/10 py-6 dark:bg-gray-900/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h4 className="font-semibold text-lg">Đăng ký nhận thông tin ưu đãi</h4>
              <p className="text-sm text-white/80">Nhận thông tin về khuyến mãi và món ăn mới</p>
            </div>
            <div className="w-full md:w-auto">
              <div className="flex">
                <input
                  type="email"
                  placeholder="Email của bạn"
                  className="px-4 py-2 rounded-l-lg w-full md:w-64 text-gray-800 focus:outline-none"
                />
                <button className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 px-4 py-2 rounded-r-lg font-medium transition-colors duration-300">
                  Đăng ký
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom copyright */}
      <div className="bg-black/20 py-4 dark:bg-black/40">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between text-sm">
            <div className="mb-2 md:mb-0">
              &copy; {currentYear} FoodDelight. Tất cả quyền được bảo lưu.
            </div>
            <div className="flex items-center space-x-2">
              <span>Được phát triển với</span>
              <Heart size={16} className="text-red-400 fill-current" />
              <span>bởi FoodDelight Team</span>
            </div>
            <div className="flex space-x-4 mt-2 md:mt-0">
              <Link to="/privacy" className="hover:text-yellow-200 transition-colors">Chính sách bảo mật</Link>
              <Link to="/terms" className="hover:text-yellow-200 transition-colors">Điều khoản sử dụng</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;