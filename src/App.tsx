import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Room, Furniture } from './types';
import { getAdvice, checkOverlap, isWindowDoorTouchingEdge, getBoundingBox } from './utils/geometry';
import RoomCanvas from './components/RoomCanvas';
import Sidebar from './components/Sidebar';
import AdvicePanel from './components/AdvicePanel';
import { ChevronLeft, ChevronRight, Undo, Redo, Download, Palette } from 'lucide-react';
import html2canvas from 'html2canvas';

// 默认房间尺寸：400cm x 300cm
const DEFAULT_ROOM: Room = { width: 400, height: 300 };

// 默认家具配置
const DEFAULT_FURNITURE: Furniture[] = [
  { id: 'bed1', type: 'bed', name: '床', width: 200, height: 150, x: 0, y: 0, rotation: 0, color: '#60a5fa' },
  { id: 'desk1', type: 'desk', name: '书桌 1', width: 120, height: 60, x: 200, y: 0, rotation: 0, color: '#34d399' },
  { id: 'desk2', type: 'desk', name: '书桌 2', width: 120, height: 60, x: 200, y: 100, rotation: 0, color: '#34d399' },
  { id: 'cab1', type: 'cabinet', name: '衣柜', width: 100, height: 60, x: 0, y: 200, rotation: 0, color: '#fbbf24' },
  { id: 'door1', type: 'door', name: '门', width: 80, height: 10, x: 160, y: 290, rotation: 0, color: '#8b5e3c' },
  { id: 'win1', type: 'window', name: '窗户', width: 100, height: 10, x: 150, y: 0, rotation: 0, color: '#bfdbfe' },
];

// localStorage 的存储键名
const STORAGE_KEY = 'room-layout-designer-state';

function loadFromStorage(): { room: Room; furniture: Furniture[] } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
  }
  return null;
}

function saveToStorage(room: Room, furniture: Furniture[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ room, furniture }));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

export default function App() {
  // ============== 状态初始化 ==============
  const initialState = loadFromStorage();

  const [room, setRoom] = useState<Room>(initialState?.room ?? DEFAULT_ROOM);
  const [furniture, setFurniture] = useState<Furniture[]>(initialState?.furniture ?? DEFAULT_FURNITURE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);

  // ============== 撤销/重做系统 ==============
  const [history, setHistory] = useState<{ room: Room; furniture: Furniture[] }[]>(
    initialState
      ? [{ room: initialState.room, furniture: initialState.furniture }]
      : [{ room: DEFAULT_ROOM, furniture: DEFAULT_FURNITURE }]
  );
  const [historyIndex, setHistoryIndex] = useState(0);
  const latestState = useRef(initialState ?? { room: DEFAULT_ROOM, furniture: DEFAULT_FURNITURE });

  useEffect(() => {
    latestState.current = { room, furniture };
  }, [room, furniture]);

  // ============== 自动保存 ==============
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    saveToStorage(room, furniture);
  }, [room, furniture]);

  // ============== 清除保存数据 ==============
  const handleClearSavedData = () => {
    if (confirm('确定要清除所有保存的数据吗？这将重置为默认布局。')) {
      localStorage.removeItem(STORAGE_KEY);
      setRoom(DEFAULT_ROOM);
      setFurniture(DEFAULT_FURNITURE);
      setSelectedId(null);
      setHistory([{ room: DEFAULT_ROOM, furniture: DEFAULT_FURNITURE }]);
      setHistoryIndex(0);
      setNotification('已清除保存的数据，恢复默认布局');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // ============== 历史记录管理 ==============
  const pushHistory = (newRoom: Room, newFurn: Furniture[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ room: newRoom, furniture: newFurn });
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  };

  const saveHistory = () => pushHistory(latestState.current.room, latestState.current.furniture);

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setRoom(history[newIndex].room);
      setFurniture(history[newIndex].furniture);
      setSelectedId(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setRoom(history[newIndex].room);
      setFurniture(history[newIndex].furniture);
      setSelectedId(null);
    }
  };

  // ============== 功能函数 ==============
  const exportPNG = async () => {
    const element = document.getElementById('room-canvas-inner');
    if (!element) return;
    const oldSelectedId = selectedId;
    setSelectedId(null);
    setTimeout(async () => {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'room-layout.png';
      link.href = dataUrl;
      link.click();
      setSelectedId(oldSelectedId);
    }, 100);
  };

  const handleUpdateRoom = (updates: Partial<Room>) => {
    const newRoom = { ...room, ...updates };
    // 遍历所有家具，根据类型应用不同的位置约束
    const newFurniture = furniture.map(f => {
      const isRotated = f.rotation % 180 !== 0;
      const w = isRotated ? f.height : f.width;
      const h = isRotated ? f.width : f.height;

      let newX = f.x;
      let newY = f.y;

      if (f.type === 'window' || f.type === 'door') {
        // 门窗允许部分超出房间边界（宽松约束）
        newX = Math.max(-w, Math.min(f.x, newRoom.width + w));
        newY = Math.max(-h, Math.min(f.y, newRoom.height + h));
      } else {
        // 普通家具必须完全在房间内
        newX = Math.max(0, Math.min(f.x, newRoom.width - w));
        newY = Math.max(0, Math.min(f.y, newRoom.height - h));
      }

      return { ...f, x: newX, y: newY };
    });
    setRoom(newRoom);
    setFurniture(newFurniture);
    pushHistory(newRoom, newFurniture);  // 记录到历史
  };

  const handleUpdateFurniture = (id: string, updates: Partial<Furniture>) => {
    setFurniture(prev => prev.map(f => {
      if (f.id !== id) return f;

      const updated = { ...f, ...updates };
      const isRotated = updated.rotation % 180 !== 0;
      const w = isRotated ? (updated.height as number) : (updated.width as number);
      const h = isRotated ? (updated.width as number) : (updated.height as number);

      // 门窗可以超出房间边界，但必须紧贴边缘（此处不限制位置，由布局规则检查约束）
      if (f.type === 'window' || f.type === 'door') {
        // 允许部分超出：x 可以小于 0 或大于 room.width，y 同理
        // 但我们仍限制在一个合理范围内，避免家具完全丢失
        updated.x = Math.max(-w, Math.min(updated.x, room.width + w));
        updated.y = Math.max(-h, Math.min(updated.y, room.height + h));
      } else {
        // 普通家具必须完全在房间内
        updated.x = Math.max(0, Math.min(updated.x, room.width - w));
        updated.y = Math.max(0, Math.min(updated.y, room.height - h));
      }

      return updated;
    }));
  };

   // ============== 布局规则检查 ==============
   const checkLayoutRules = () => {
     const newAdvice: { type: 'error' | 'warning' | 'success' | 'info'; message: string }[] = [];

     // 1. 检查所有家具之间的重叠（任何两个都不能重叠）
     for (let i = 0; i < furniture.length; i++) {
       for (let j = i + 1; j < furniture.length; j++) {
         const f1 = furniture[i];
         const f2 = furniture[j];
         if (checkOverlap(f1, f2, false)) {
           const types = [f1.type, f2.type];
           // 如果涉及门，优先提示"门被挡住"
           if (types.includes('door')) {
             const blocker = f1.type === 'door' ? f2.name : f1.name;
             newAdvice.push({ type: 'error', message: `门被 ${blocker} 挡住了！` });
           } else if (types.includes('window') && types.includes('cabinet')) {
             newAdvice.push({ type: 'warning', message: `衣柜可能会挡住窗户的光线。` });
           } else {
             newAdvice.push({ type: 'error', message: `${f1.name} 和 ${f2.name} 不能重叠` });
           }
         }
       }
     }

     // 2. 检查窗户/门：必须紧贴房间边缘
     const specialFurnitures = furniture.filter(f => f.type === 'window' || f.type === 'door');
     for (const f of specialFurnitures) {
       if (!isWindowDoorTouchingEdge(f, room)) {
         newAdvice.push({ type: 'warning', message: `${f.name} 必须紧贴房间边缘！` });
       }
     }

    // 床是否靠墙
    const bed = furniture.find(f => f.type === 'bed');
    if (bed) {
      const b = getBoundingBox(bed as Furniture);
      const nearWall = b.left <= 10 || b.right >= room.width - 10 || b.top <= 10 || b.bottom >= room.height - 10;
      if (!nearWall) newAdvice.push({ type: 'warning', message: '床没有靠墙，可能会浪费空间并缺乏心理安全感' });
    }

    // 衣柜与窗户/门的交互
    const cabinet = furniture.find(f => f.type === 'cabinet');
    const windowExists = furniture.some(f => f.type === 'window');
    if (cabinet && windowExists) newAdvice.push({ type: 'info', message: '衣柜可能会挡住窗户的光线，建议调整位置' });

    // 两张书桌是否适合双人协作
    const desks = furniture.filter(f => f.type === 'desk');
    if (desks.length === 2) {
      const d1 = getBoundingBox(desks[0]);
      const d2 = getBoundingBox(desks[1]);
      const dist = Math.max(d1.left - d2.right, d2.left - d1.right, d1.top - d2.bottom, d2.top - d1.bottom);
      if (dist < 20) newAdvice.push({ type: 'info', message: '两张书桌靠得很近，适合双人共同学习或工作' });
    }

    // 衣柜开门空间检查
    if (cabinet) {
      const b = getBoundingBox(cabinet);
      const hasClearance = b.left > 60 || b.right < room.width - 60 || b.top > 60 || b.bottom < room.height - 60;
      if (!hasClearance) newAdvice.push({ type: 'warning', message: '请确保柜子门前至少有 60cm 的开门空间' });
      else newAdvice.push({ type: 'info', message: '柜子周围空间充足，方便日常拿取衣物' });
    }

    if (newAdvice.length === 0) newAdvice.push({ type: 'success', message: '当前布局看起来非常合理！尽情发挥你的创意吧～' });
    return newAdvice;
  };

   // ============== 渲染 ==============
  const advice = useMemo(() => checkLayoutRules(), [room, furniture]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* 顶部通知栏 */}
      {notification && (
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-2 text-sm text-blue-800 flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-blue-600 hover:text-blue-800">×</button>
        </div>
      )}
      <header className="bg-white border-b border-gray-200 px-6 py-2 flex-shrink-0 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">房间布局设计器</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={undo} disabled={historyIndex === 0} className="p-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="撤销">
            <Undo size={20} />
          </button>
          <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="重做">
            <Redo size={20} />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <button onClick={exportPNG} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm" title="导出 PNG">
            <Download size={16} />
            <span>导出 PNG</span>
          </button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden relative">
        <div className={`transition-all duration-300 ease-in-out flex-shrink-0 bg-white border-r border-gray-200 z-10 overflow-hidden ${isSidebarOpen ? 'w-80' : 'w-0'}`}>
          <div className="w-80 h-full overflow-y-auto">
            <Sidebar 
              room={room} 
              onUpdateRoom={handleUpdateRoom} 
              furniture={furniture} 
              selectedId={selectedId} 
              onUpdateFurniture={handleUpdateFurniture} 
              onAddItem={(item) => { 
                const newId = `${item.type}-${Date.now()}`; 
                const x = Math.max(0, Math.round((room.width - item.width) / 2 / 5) * 5); 
                const y = Math.max(0, Math.round((room.height - item.height) / 2 / 5) * 5); 
                const newFurniture = [...furniture, { ...item, id: newId, x, y }]; 
                setFurniture(newFurniture); 
                setSelectedId(newId); 
                pushHistory(room, newFurniture); 
              }} 
              onRemoveFurniture={(id) => { 
                const newFurniture = furniture.filter(f => f.id !== id); 
                setFurniture(newFurniture); 
                if (selectedId === id) setSelectedId(null); 
                pushHistory(room, newFurniture); 
              }}
              onClearSavedData={handleClearSavedData}
            />
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute top-4 z-20 bg-white border border-gray-200 shadow-md rounded-r-md p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300" style={{ left: isSidebarOpen ? '320px' : '0' }} title={isSidebarOpen ? "收起侧边栏" : "展开侧边栏"}>
          {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
        <main className="flex-1 flex flex-col relative min-w-0">
          <div className="flex-1 relative">
            <RoomCanvas room={room} furniture={furniture} onUpdateFurniture={handleUpdateFurniture} selectedId={selectedId} onSelect={setSelectedId} onDragEnd={saveHistory} />
          </div>
          <AdvicePanel advice={advice} />
        </main>
      </div>
    </div>
  );
}