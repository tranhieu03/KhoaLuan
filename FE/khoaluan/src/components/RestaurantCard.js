import React from 'react';
import { Star, MapPin } from 'lucide-react';

const RestaurantCard = ({ name, address, image, rating }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="relative h-32">
        <img 
          src={image || 'https://via.placeholder.com/400x200'} 
          alt={name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-4">
          <h2 className="text-white font-bold text-lg">{name}</h2>
          {rating && (
            <div className="flex items-center mt-1">
              <div className="flex items-center bg-white/90 px-2 py-0.5 rounded">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 mr-1" />
                <span className="text-xs font-semibold text-gray-800">{rating.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 flex items-start">
        <MapPin className="w-4 h-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
        <p className="text-sm text-gray-600">{address}</p>
      </div>
    </div>
  );
};

export default RestaurantCard;