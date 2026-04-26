import React from 'react';
import { Room, Furniture } from '../types';

// 侧边栏属性接口
interface SidebarProps {
  room: Room;                    // 房间尺寸
  onUpdateRoom: (updates: Partial<Room>) => void;  // 更新房间的回调
  furniture: Furniture[];       // 家具列表
  selectedId: string | null;    // 当前选中的家具ID
  onUpdateFurniture: (id: string, updates: Partial<Furniture>) => void;  // 更新家具的回调
  onAddItem: (item: Omit<Furniture, 'id'>) => void;  // 添加家具的回调
  onRemoveFurniture: (id: string) => void;  // 删除家具的回调
  onClearSavedData?: () => void;  // 清除保存数据的回调（可选）
}

export default function Sidebar({ room, onUpdateRoom, furniture, selectedId, onUpdateFurniture, onAddItem, onRemoveFurniture, onClearSavedData }: SidebarProps) {
  const selectedItem = furniture.find(f => f.id === selectedId);

  return (
    // 侧边栏容器：固定宽度 320px（w-80），白色背景，右侧边框
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
      {/* 顶部：添加家具按钮 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">添加物件</h2>
          {onClearSavedData && (
            <button
              onClick={onClearSavedData}
              className="text-xs px-2 py-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="清除保存的布局数据"
            >
              清除保存
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* 快速添加不同类型的家具 */}
          <button
            onClick={() => onAddItem({ type: 'door', name: '门', width: 80, height: 10, x: 0, y: 0, rotation: 0, color: '#8b5e3c' })}
            className="px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium transition-colors"
          >
            + 门
          </button>
          <button
            onClick={() => onAddItem({ type: 'window', name: '窗户', width: 100, height: 10, x: 0, y: 0, rotation: 0, color: '#0ea5e9' })}
            className="px-3 py-2 bg-sky-50 text-sky-600 rounded hover:bg-sky-100 text-sm font-medium transition-colors"
          >
            + 窗户
          </button>
          <button
            onClick={() => onAddItem({ type: 'other', name: '自定义', width: 50, height: 50, x: 0, y: 0, rotation: 0, color: '#8b5cf6' })}
            className="px-3 py-2 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 text-sm font-medium transition-colors"
          >
            + 其他
          </button>
          <button
            onClick={() => onAddItem({ type: 'desk', name: '书桌', width: 120, height: 60, x: 0, y: 0, rotation: 0, color: '#34d399' })}
            className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 text-sm font-medium transition-colors"
          >
            + 书桌
          </button>
        </div>
      </div>

      {/* 第二部分：房间尺寸设置 */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">房间设置</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">长度 (cm)</label>
            <input 
              type="number" 
              value={room.width}
              // 修改房间长度时，自动约束家具位置防止超出边界
              onChange={(e) => onUpdateRoom({ width: Number(e.target.value) || 100 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              min="100"
              max="1000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">宽度 (cm)</label>
            <input 
              type="number" 
              value={room.height}
              onChange={(e) => onUpdateRoom({ height: Number(e.target.value) || 100 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              min="100"
              max="1000"
            />
          </div>
        </div>
      </div>

      {/* 第三部分：选中家具的属性编辑 */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">家具属性</h2>
        {selectedItem ? (
          <div className="space-y-4">
            {/* 显示选中家具的名称和类型 */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-800">{selectedItem.name}</span>
              <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">{selectedItem.type}</span>
            </div>
            
            {/* 尺寸输入框：长度和宽度 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">长度 (cm)</label>
                <input
                  type="number"
                  value={selectedItem.width}
                  onChange={(e) => onUpdateFurniture(selectedItem.id, { width: Number(e.target.value) || 10 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  min="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">宽度 (cm)</label>
                <input
                  type="number"
                  value={selectedItem.height}
                  onChange={(e) => onUpdateFurniture(selectedItem.id, { height: Number(e.target.value) || 10 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  min="10"
                />
              </div>
            </div>

            {/* 颜色选择器 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">填充颜色</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={selectedItem.color}
                  onChange={(e) => onUpdateFurniture(selectedItem.id, { color: e.target.value })}
                  className="w-12 h-10 rounded-md cursor-pointer border border-gray-300 p-0.5"
                />
                <input
                  type="text"
                  value={selectedItem.color}
                  onChange={(e) => onUpdateFurniture(selectedItem.id, { color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#000000"
                />
              </div>
              {/* 预设颜色调色板 */}
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  { color: '#60a5fa', name: '蓝色' },
                  { color: '#34d399', name: '绿色' },
                  { color: '#fbbf24', name: '黄色' },
                  { color: '#ef4444', name: '红色' },
                  { color: '#0ea5e9', name: '天蓝' },
                  { color: '#8b5cf6', name: '紫色' },
                  { color: '#f97316', name: '橙色' },
                  { color: '#10b981', name: '青绿' },
                  { color: '#6b7280', name: '灰色' },
                  { color: '#1f2937', name: '深灰' },
                ].map(({ color, name }) => (
                  <button
                    key={color}
                    onClick={() => onUpdateFurniture(selectedItem.id, { color })}
                    className="group relative w-8 h-8 rounded-md border-2 border-gray-300 hover:border-gray-500 transition-all hover:scale-110"
                    style={{ backgroundColor: color }}
                    title={name}
                  >
                    <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {name}
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
                    onUpdateFurniture(selectedItem.id, { color: randomColor });
                  }}
                  className="w-8 h-8 rounded-md border-2 border-dashed border-gray-400 hover:border-gray-600 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all"
                  title="随机颜色"
                >
                  ?
                </button>
              </div>
            </div>
            
            <div className="pt-4 space-y-3">
              <p className="text-xs text-gray-500">
                提示：在画布中拖拽边缘或角落可以改变大小。点击右上角按钮可以旋转。
              </p>
              <button
                onClick={() => onRemoveFurniture(selectedItem.id)}
                className="w-full px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 text-sm font-medium transition-colors"
              >
                删除选中物件
              </button>
              <div className="text-xs">
                <p className="text-gray-600 mb-1">
                  <span className="font-medium">规则：</span>
                  {selectedItem.type === 'door' || selectedItem.type === 'window' ? (
                    <span className="text-amber-700">门窗必须紧贴房间边缘（允许部分超出）</span>
                  ) : (
                    <span className="text-gray-700">普通家具不能重叠且必须在房间内</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            请在右侧画布中点击选择一个家具进行编辑
          </div>
        )}
      </div>
    </div>
  );
}
