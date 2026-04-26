import React, { useRef, useState, useEffect } from 'react';
import { Room, Furniture } from '../types';
import { RotateCw } from 'lucide-react';

// 画布组件属性接口
interface RoomCanvasProps {
  room: Room;                      // 房间尺寸
  furniture: Furniture[];         // 家具列表
  onUpdateFurniture: (id: string, updates: Partial<Furniture>) => void;  // 更新家具回调
  selectedId: string | null;      // 当前选中的家具ID
  onSelect: (id: string | null) => void;  // 选择家具回调
  onDragEnd: () => void;          // 拖拽结束回调（保存历史记录）
}

export default function RoomCanvas({ room, furniture, onUpdateFurniture, selectedId, onSelect, onDragEnd }: RoomCanvasProps) {
  // 容器引用，用于计算缩放比例
  const containerRef = useRef<HTMLDivElement>(null);
  // 缩放比例：将实际 cm 转换为屏幕 px
  const [scale, setScale] = useState(1);

  // ============== 自动缩放逻辑 ==============
  // 计算缩放比例，让房间完整显示在容器中（保持宽高比）
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const padding = 40; // 左右各 20px 的内边距
      const availableWidth = clientWidth - padding;
      const availableHeight = clientHeight - padding;
      
      // 分别计算宽和高的缩放比，取较小的以确保房间完全可见
      const scaleX = availableWidth / room.width;
      const scaleY = availableHeight / room.height;
      const newScale = Math.min(scaleX, scaleY);
      
      setScale(newScale);
    };

    updateScale();
    // 窗口大小变化时重新计算缩放
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [room.width, room.height]);

  // ============== 家具拖拽处理 ==============
  
  /**
   * 处理家具拖拽开始（pointer down）
   * 使用 Pointer Events API 实现跨设备（鼠标/触摸）支持
   */
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();  // 阻止事件冒泡（避免触发画布的取消选择）
    
    onSelect(id);  // 选中该家具

    const target = e.currentTarget as HTMLElement;
    // 捕获指针，确保拖拽过程中持续接收事件（即使移出元素）
    target.setPointerCapture(e.pointerId);

    // 记录鼠标/手指按下的初始位置（屏幕像素坐标）
    const startX = e.clientX;
    const startY = e.clientY;
    
    // 查找对应的家具数据
    const item = furniture.find(f => f.id === id);
    if (!item) return;

    // 记录家具初始位置（实际 cm 坐标）
    const startItemX = item.x;
    const startItemY = item.y;

    // 处理拖拽移动
    const handlePointerMove = (moveEvent: PointerEvent) => {
      // 计算像素位移并转换为实际 cm（除以缩放比例）
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      
      // 网格吸附：每次移动自动对齐到 5cm 网格
      const newX = Math.round((startItemX + dx) / 5) * 5;
      const newY = Math.round((startItemY + dy) / 5) * 5;

      // 实时更新家具位置（不记录历史，拖拽结束时统一记录）
      onUpdateFurniture(id, { x: newX, y: newY });
    };

    // 处理拖拽结束
    const handlePointerUp = (upEvent: PointerEvent) => {
      target.releasePointerCapture(upEvent.pointerId);
      target.removeEventListener('pointermove', handlePointerMove);
      target.removeEventListener('pointerup', handlePointerUp);
      onDragEnd();  // 通知父组件保存历史记录
    };

    // 注册移动和抬起事件监听器
    target.addEventListener('pointermove', handlePointerMove);
    target.addEventListener('pointerup', handlePointerUp);
  };

  // ============== 家具缩放处理 ==============
  
  /**
   * 处理缩放手柄拖拽开始
   * @param dir 拖拽方向（nw/n/ne/e/se/s/sw/w 八方向）
   */
  const handleResizePointerDown = (e: React.PointerEvent, dir: string, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    // 记录初始位置
    const startX = e.clientX;
    const startY = e.clientY;
    const item = furniture.find(f => f.id === id);
    if (!item) return;

    // 计算家具当前的实际显示尺寸（考虑旋转）
    const isRotated = item.rotation % 180 !== 0;
    const startVisualWidth = isRotated ? item.height : item.width;
    const startVisualHeight = isRotated ? item.width : item.height;
    const startXPos = item.x;
    const startYPos = item.y;

    // 处理缩放移动
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      let newX = startXPos;        // 新的 X 坐标
      let newY = startYPos;        // 新的 Y 坐标
      let newVWidth = startVisualWidth;   // 新的显示宽度
      let newVHeight = startVisualHeight; // 新的显示高度

      // 根据拖拽方向调整边界和尺寸
      // 西侧（左）：调整位置和宽度
      if (dir.includes('w')) {
        newX = Math.min(startXPos + dx, startXPos + startVisualWidth - 10); // 限制最小宽度 10cm
        newX = Math.max(0, newX);  // 不能超出房间左边界
        newVWidth = startXPos + startVisualWidth - newX;
      }
      // 东侧（右）：只增加宽度
      if (dir.includes('e')) {
        newVWidth = Math.max(10, startVisualWidth + dx); // 最小宽度 10cm
        newVWidth = Math.min(newVWidth, room.width - startXPos); // 不能超出房间右边界
      }
      // 北侧（上）：调整位置和高度
      if (dir.includes('n')) {
        newY = Math.min(startYPos + dy, startYPos + startVisualHeight - 10); // 限制最小高度 10cm
        newY = Math.max(0, newY);  // 不能超出房间上边界
        newVHeight = startYPos + startVisualHeight - newY;
      }
      // 南侧（下）：只增加高度
      if (dir.includes('s')) {
        newVHeight = Math.max(10, startVisualHeight + dy); // 最小高度 10cm
        newVHeight = Math.min(newVHeight, room.height - startYPos); // 不能超出房间下边界
      }

      // 网格吸附：对齐到 5cm 网格
      newX = Math.round(newX / 5) * 5;
      newY = Math.round(newY / 5) * 5;
      newVWidth = Math.round(newVWidth / 5) * 5;
      newVHeight = Math.round(newVHeight / 5) * 5;

      // 如果家具旋转了，宽高需要互换
      const newWidth = isRotated ? newVHeight : newVWidth;
      const newHeight = isRotated ? newVWidth : newVHeight;

      // 更新家具的位置和尺寸
      onUpdateFurniture(id, { x: newX, y: newY, width: newWidth, height: newHeight });
    };

    // 处理缩放结束
    const handlePointerUp = (upEvent: PointerEvent) => {
      target.releasePointerCapture(upEvent.pointerId);
      target.removeEventListener('pointermove', handlePointerMove);
      target.removeEventListener('pointerup', handlePointerUp);
      onDragEnd();  // 通知父组件保存历史记录
    };

    target.addEventListener('pointermove', handlePointerMove);
    target.addEventListener('pointerup', handlePointerUp);
  };

  // ============== 缩放手柄渲染 ==============
  
  /**
   * 为选中的家具渲染 8 个缩放手柄（四角+四边）
   */
  const renderHandles = (item: Furniture) => {
    const handleClasses = "absolute bg-white border border-blue-500 shadow-sm z-20";  // 白色手柄，蓝色边框
    const size = 10;  // 手柄大小 10px
    const offset = -5; // 偏移量（使手柄中心对齐边界）

    // 8 个手柄的位置（北西、北、北东、东、南东、南、南西、西）
    const positions = [
      { dir: 'nw', style: { top: offset, left: offset, cursor: 'nwse-resize' } },     // 左上
      { dir: 'n',  style: { top: offset, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },   // 上中
      { dir: 'ne', style: { top: offset, right: offset, cursor: 'nesw-resize' } },   // 右上
      { dir: 'e',  style: { top: '50%', right: offset, transform: 'translateY(-50%)', cursor: 'ew-resize' } },   // 右中
      { dir: 'se', style: { bottom: offset, right: offset, cursor: 'nwse-resize' } }, // 右下
      { dir: 's',  style: { bottom: offset, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },  // 下中
      { dir: 'sw', style: { bottom: offset, left: offset, cursor: 'nesw-resize' } },  // 左下
      { dir: 'w',  style: { top: '50%', left: offset, transform: 'translateY(-50%)', cursor: 'ew-resize' } },    // 左中
    ];

    return positions.map(({ dir, style }) => (
      <div
        key={dir}
        className={handleClasses}
        style={{ ...style, width: size, height: size }}
        onPointerDown={(e) => handleResizePointerDown(e, dir, item.id)}
      />
    ));
  };

  // ============== 渲染 ==============
  
  return (
    // 画布容器：填满可用空间，灰色背景，居中显示房间
    <div 
      ref={containerRef} 
      className="w-full h-full bg-gray-100 flex items-center justify-center overflow-hidden relative"
      onPointerDown={() => onSelect(null)}  // 点击空白处取消选中
    >
      {/* 房间内层：实际画布区域 */}
      <div 
        id="room-canvas-inner"
        className="shadow-lg relative transition-all duration-300 ease-out"
        style={{
          width: room.width * scale,     // 实际宽度（cm × 缩放）
          height: room.height * scale,   // 实际高度（cm × 缩放）
          backgroundColor: '#fdf6e3',     // 米白色房间背景
          // 20cm 网格背景（通过 CSS 渐变实现）
          backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
          backgroundSize: `${20 * scale}px ${20 * scale}px` // 网格大小随缩放调整
        }}
      >
        {/* 遍历渲染所有家具 */}
        {furniture.map(item => {
          const isSelected = item.id === selectedId;  // 是否选中
          const isRotated = item.rotation % 180 !== 0; // 是否旋转
          // 根据旋转计算实际显示尺寸
          const w = isRotated ? item.height : item.width;
          const h = isRotated ? item.width : item.height;

          return (
            // 家具 DOM 元素
            <div
              key={item.id}
              // 样式：绝对定位、居中内容、圆角、阴影、选中高亮、悬停效果
              className={`absolute cursor-move flex items-center justify-center select-none rounded-lg transition-transform transition-shadow duration-200 ${isSelected ? 'ring-2 ring-blue-500 shadow-xl z-10' : 'shadow-md z-0 hover:ring-2 hover:ring-blue-300 hover:scale-[1.02]'}`}
              style={{
                width: w * scale,           // 缩放后的宽度
                height: h * scale,          // 缩放后的高度
                left: item.x * scale,       // 缩放后的 X 坐标
                top: item.y * scale,        // 缩放后的 Y 坐标
                backgroundColor: item.color, // 家具颜色
                opacity: 0.9,               // 轻微透明
                touchAction: 'none'         // 禁用默认触摸行为（用于 Pointer Events）
              }}
              onPointerDown={(e) => handlePointerDown(e, item.id)}  // 拖拽开始
            >
              {/* 家具名称标签 */}
              <span className="text-white font-medium text-sm drop-shadow-md pointer-events-none">
                {item.name}
              </span>
              
              {/* 如果选中，渲染缩放手柄 */}
              {isSelected && renderHandles(item)}

              {/* 选中时显示旋转按钮 */}
              {isSelected && (
                <button
                  className="absolute -top-10 right-0 bg-white p-2 rounded-full shadow-md text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  onPointerDown={(e) => {
                    e.stopPropagation();  // 阻止触发拖拽
                    onUpdateFurniture(item.id, { rotation: (item.rotation + 90) % 360 });  // 旋转 90 度
                    onDragEnd();
                  }}
                  title="旋转 90 度"
                >
                  <RotateCw size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
