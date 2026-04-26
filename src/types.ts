// 家具类型枚举
export type FurnitureType = 'bed' | 'desk' | 'cabinet' | 'door' | 'window' | 'other';

/**
 * 家具接口定义
 */
export interface Furniture {
  id: string;           // 唯一标识符（自动生成）
  type: FurnitureType; // 家具类型（用于分类和特定逻辑）
  name: string;        // 显示名称
  width: number;       // 宽度（cm）
  height: number;      // 高度（cm）
  x: number;           // 左上角 X 坐标（cm）
  y: number;           // 左上角 Y 坐标（cm）
  rotation: number;    // 旋转角度（0/90/180/270 度）
  color: string;       // 显示颜色（十六进制）
}

/**
 * 房间接口定义
 */
export interface Room {
  width: number;   // 房间长度（cm）
  height: number;  // 房间宽度（cm）
}