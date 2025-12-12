import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ItineraryItem } from '../types';
import { Modal } from './ui/Modal';

declare global {
  interface Window {
    L: any;
  }
}

interface ItineraryViewProps {
  items: ItineraryItem[];
  travelDates: string[];
  onAdd: (item: ItineraryItem) => void;
  onUpdate: (item: ItineraryItem) => void;
  onDelete: (id: string) => void;
}

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  '首爾': { lat: 37.5665, lng: 126.9780 },
  '濟州': { lat: 33.3617, lng: 126.5292 },
  '香港': { lat: 22.3193, lng: 114.1694 }
};

export const ItineraryView: React.FC<ItineraryViewProps> = ({ items, travelDates, onAdd, onUpdate, onDelete }) => {
  const [selectedDate, setSelectedDate] = useState<string>(travelDates[0]);
  const [weather, setWeather] = useState<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<ItineraryItem>>({});

  const filteredItems = useMemo(() => {
    return items.filter(item => item.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  }, [items, selectedDate]);
  
  const getCityByDate = (date: string) => {
    if (date >= '2025-12-24' && date <= '2025-12-27') return '首爾';
    if (date >= '2025-12-28' && date <= '2025-12-31') return '濟州';
    return '首爾';
  };

  const currentCity = filteredItems.length > 0 ? filteredItems[0].city : getCityByDate(selectedDate);

  // Weather Logic
  useEffect(() => {
    const city = currentCity;
    const dateIndex = travelDates.indexOf(selectedDate);
    const seed = dateIndex !== -1 ? dateIndex : 0;
    
    let maxTemp = city === '濟州' ? 12 : 2;
    let minTemp = city === '濟州' ? 6 : -5;
    
    const variation = Math.sin(seed) * 3;
    maxTemp += Math.round(variation); 
    minTemp += Math.round(variation);

    const conditions = ['Sunny', 'Partly Cloudy', 'Snowy', 'Clear'];
    const condition = conditions[(seed + city.length) % conditions.length];
    
    const icons: Record<string, string> = {
      'Sunny': '☀️', 'Partly Cloudy': '⛅️', 'Snowy': '❄️', 'Clear': '🌙'
    };

    const timer = setTimeout(() => {
      setWeather({
        icon: icons[condition] || '⛅️',
        temp: `${maxTemp}° / ${minTemp}°`,
        desc: condition
      });
    }, 150); 
    return () => clearTimeout(timer);
  }, [currentCity, selectedDate, travelDates]);

  // Map Initialization and Update
  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    if (!mapInstance.current) {
        const center = CITY_COORDINATES[currentCity] || CITY_COORDINATES['首爾'];
        const map = window.L.map(mapContainerRef.current, {
           attributionControl: false,
           zoomControl: false 
        }).setView([center.lat, center.lng], currentCity === '濟州' ? 9 : 11);
        
        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19
        }).addTo(map);
        
        window.L.control.zoom({ position: 'bottomright' }).addTo(map);

        markersLayerRef.current = window.L.layerGroup().addTo(map);
        mapInstance.current = map;
    }

    const map = mapInstance.current;
    const markersLayer = markersLayerRef.current;
    
    markersLayer.clearLayers();

    const dayPoints = filteredItems.filter(i => i.lat && i.lng);
    const center = CITY_COORDINATES[currentCity] || CITY_COORDINATES['首爾'];
    const latLngs: any[] = [];
    
    const createNumberedIcon = (number: number) => {
      return window.L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #3b82f6; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${number}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
    };

    dayPoints.forEach((p, index) => {
      if (p.lat && p.lng) {
        window.L.marker([p.lat, p.lng], { icon: createNumberedIcon(index + 1) })
          .addTo(markersLayer)
          .bindPopup(`<b>${index + 1}. ${p.time}</b><br>${p.title}`);
        latLngs.push([p.lat, p.lng]);
      }
    });

    if (latLngs.length > 0) {
      window.L.polyline(latLngs, { color: '#4A4A4A', weight: 4, dashArray: '10, 15', opacity: 0.7 }).addTo(markersLayer);
      try {
        map.fitBounds(window.L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 15 });
      } catch (e) {}
    } else {
      map.setView([center.lat, center.lng], currentCity === '濟州' ? 10 : 12);
    }
  }, [filteredItems, currentCity]);

  const handleSave = () => {
    if (!editingItem.title || !editingItem.time) {
      alert("請填寫標題與時間");
      return;
    }
    
    let safeLat = undefined;
    let safeLng = undefined;

    if (editingItem.lat) {
       const parsed = parseFloat(editingItem.lat.toString());
       if (!isNaN(parsed)) safeLat = parsed;
    } else {
       safeLat = CITY_COORDINATES[currentCity]?.lat;
    }

    if (editingItem.lng) {
       const parsed = parseFloat(editingItem.lng.toString());
       if (!isNaN(parsed)) safeLng = parsed;
    } else {
       safeLng = CITY_COORDINATES[currentCity]?.lng;
    }

    const newItem: ItineraryItem = {
      id: editingItem.id || '',
      date: selectedDate,
      time: editingItem.time || '10:00',
      type: editingItem.type || 'activity',
      city: editingItem.city || currentCity,
      title: editingItem.title || '',
      location: editingItem.location || '',
      lat: safeLat,
      lng: safeLng,
      icon: editingItem.icon || '📍',
      travelMode: editingItem.travelMode,
      travelTimeMinutes: editingItem.travelTimeMinutes
    };

    if (editingItem.id) {
      onUpdate(newItem);
    } else {
      onAdd(newItem);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
  };

  const getNaverMapUrl = (location: string) => {
    return `https://map.naver.com/p/search/${encodeURIComponent(location)}`;
  };

  const getDirectionsUrl = (startItem: ItineraryItem, endItem: ItineraryItem) => {
    if (startItem.lat && startItem.lng && endItem.lat && endItem.lng) {
      const mode = currentCity === '首爾' ? 'transit' : 'car';
      const params = new URLSearchParams();
      params.append('slat', startItem.lat.toString());
      params.append('slng', startItem.lng.toString());
      params.append('stext', startItem.title);
      params.append('elat', endItem.lat.toString());
      params.append('elng', endItem.lng.toString());
      params.append('etext', endItem.title);
      params.append('menu', 'route');
      params.append('pathType', mode === 'transit' ? '1' : '0'); 
      return `https://map.naver.com/p/directions?${params.toString()}`;
    }
    return getNaverMapUrl(endItem.location || endItem.title);
  };

  return (
    <div className="px-4 pt-2">
      <div className="py-2 mb-4 overflow-x-auto no-scrollbar">
        <div className="flex space-x-3">
          {travelDates.map(date => {
             const d = new Date(date);
             const day = d.getDate();
             const month = d.getMonth() + 1;
             return (
               <button 
                 key={date} 
                 onClick={() => setSelectedDate(date)}
                 className={`flex-shrink-0 w-20 h-24 flex flex-col justify-center items-center rounded-lg shadow-sm transition-colors duration-200 border ${selectedDate === date ? 'bg-muji-accent text-white border-transparent' : 'bg-white border-muji-border'}`}
               >
                 <span className="font-bold text-xl">{day}</span>
                 <span className="text-xs font-medium">{month}月</span>
               </button>
             );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 flex items-center justify-between shadow-soft border border-gray-100 mb-6 transition-all duration-300">
        {weather ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <div className="text-4xl mr-4">{weather.icon}</div>
              <div>
                <p className="font-bold text-xl text-muji-text">{weather.temp}</p>
                <p className="text-xs text-muji-subtle">{weather.desc}</p>
              </div>
            </div>
            <div className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100">
              📍 {currentCity}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muji-subtle">載入天氣中...</div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-xs font-bold text-muji-subtle mb-2 uppercase tracking-wide">路線預覽 (Naver Maps)</h2>
        <div ref={mapContainerRef} className="w-full h-64 rounded-xl shadow-inner border border-gray-200 overflow-hidden bg-gray-100 relative z-10" />
      </div>

      <div className="flex justify-between items-center mt-2 mb-4">
        <h2 className="text-xl font-bold text-muji-text">當日行程</h2>
        <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="bg-muji-accent text-white font-bold py-2 px-4 rounded-lg shadow-soft text-sm active:scale-95 transition-transform">
          + 新增
        </button>
      </div>

      <div className="relative pb-20">
        <div className="absolute left-[26px] top-4 bottom-4 w-0.5 bg-gray-200 z-0"></div>
        
        {filteredItems.map((item, index) => (
          <div key={item.id} className="mb-6 relative z-10">
            <div className="flex items-start">
               <div className="flex flex-col items-center w-14 flex-shrink-0 bg-muji-bg z-10 pt-1">
                  <span className="font-bold text-sm font-mono text-muji-accent">{item.time}</span>
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white border border-gray-200 flex items-center justify-center text-sm font-bold mt-1 shadow-sm z-20">
                      {index + 1}
                  </div>
               </div>

               <div className="flex-grow bg-white rounded-xl p-4 shadow-soft border border-gray-100 ml-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-muji-text text-lg">{item.title}</p>
                      {item.location && (
                        <a 
                          href={getNaverMapUrl(item.location)} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs text-green-600 mt-1 flex items-center hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="mr-1">N</span> {item.location}
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {item.type === 'flight' && (
                     <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700 font-mono">
                        Flight information attached
                     </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-gray-50 flex justify-end space-x-2 relative z-50">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsModalOpen(true); }} 
                      className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded font-bold"
                    >
                      編輯
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, item.id)} 
                      className="text-xs bg-red-50 text-red-500 hover:bg-red-100 px-3 py-2 rounded font-bold"
                    >
                      刪除
                    </button>
                  </div>
               </div>
            </div>
            
            {index < filteredItems.length - 1 && (
               <div className="ml-14 mb-4 pl-4 pt-2">
                 <div className="flex items-center">
                    <span className="h-6 w-0.5 bg-gray-300 inline-block mr-3"></span>
                    <a 
                      href={getDirectionsUrl(item, filteredItems[index + 1])}
                      target="_blank"
                      rel="noreferrer" 
                      className="text-xs text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded-full shadow-sm flex items-center transition-colors"
                    >
                      <span className="mr-1">🚦</span> 
                      {currentCity === '首爾' ? '鐵路時間' : '駕駛時間'} (Naver)
                    </a>
                 </div>
               </div>
            )}
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center text-gray-400 py-10 bg-white rounded-xl border border-dashed border-gray-300">
            本日無行程
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem.id ? "編輯行程" : "新增行程"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500">時間</label>
            <input 
              type="time" 
              value={editingItem.time || ''} 
              onChange={e => setEditingItem({...editingItem, time: e.target.value})}
              className="w-full p-3 bg-gray-50 rounded-lg border-transparent focus:bg-white focus:ring-2 focus:ring-muji-accent"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">標題</label>
            <input 
              value={editingItem.title || ''} 
              onChange={e => setEditingItem({...editingItem, title: e.target.value})}
              placeholder="例：逛街、吃飯"
              className="w-full p-3 bg-gray-50 rounded-lg"
            />
          </div>
           <div>
            <label className="text-xs font-bold text-gray-500">座標</label>
            <div className="flex gap-2">
              <input 
                type="number"
                placeholder="Lat"
                value={editingItem.lat || ''} 
                onChange={e => setEditingItem({...editingItem, lat: e.target.value as any})}
                className="w-1/2 p-3 bg-gray-50 rounded-lg"
              />
               <input 
                type="number"
                placeholder="Lng"
                value={editingItem.lng || ''} 
                onChange={e => setEditingItem({...editingItem, lng: e.target.value as any})}
                className="w-1/2 p-3 bg-gray-50 rounded-lg"
              />
            </div>
          </div>
          <button onClick={handleSave} className="w-full bg-muji-accent text-white py-3 rounded-lg font-bold shadow-soft active:translate-y-1 active:shadow-none transition-all mt-2">
            儲存
          </button>
        </div>
      </Modal>
    </div>
  );
};