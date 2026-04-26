import React from 'react';
import { Advice } from '../utils/geometry';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

// 建议面板属性接口
interface AdvicePanelProps {
  advice: Advice[];  // 建议列表
}

export default function AdvicePanel({ advice }: AdvicePanelProps) {
  // 根据建议类型返回对应的图标
  const getIcon = (type: Advice['type']) => {
    switch (type) {
      case 'error':   return <AlertCircle className="w-5 h-5 text-red-500" />;    // 错误：红色警告图标
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />; // 警告：黄色三角图标
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />; // 成功：绿色勾选图标
      case 'info':    return <Info className="w-5 h-5 text-blue-500" />;          // 信息：蓝色信息图标
    }
  };

  // 根据建议类型返回对应的背景色和边框色
  const getBgColor = (type: Advice['type']) => {
    switch (type) {
      case 'error':   return 'bg-red-50 border-red-100';
      case 'warning': return 'bg-amber-50 border-amber-100';
      case 'success': return 'bg-green-50 border-green-100';
      case 'info':    return 'bg-blue-50 border-blue-100';
    }
  };

  return (
    // 底部建议面板：固定高度最大 256px（max-h-64），可滚动
    <div className="bg-white border-t border-gray-200 p-4 max-h-64 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">智能布局建议</h3>
      {/* 响应式网格布局：小屏单列，中屏双列，大屏三列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {advice.map((item, index) => (
          <div 
            key={index} 
            className={`flex items-start p-3 rounded-lg border ${getBgColor(item.type)}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(item.type)}
            </div>
            <div className="ml-3 text-sm text-gray-800">
              {item.message}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
