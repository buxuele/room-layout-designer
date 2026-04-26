import { Furniture, Room } from '../types';

/**
 * 计算家具的轴对齐包围盒 (AABB)
 * 考虑家具的旋转角度，计算实际占用的矩形区域
 */
export function getBoundingBox(f: Furniture) {
  // 判断家具是否旋转了 90 度或 270 度（即宽高互换）
  const isRotated = f.rotation % 180 !== 0;
  // 根据旋转状态计算实际宽度和高度
  const w = isRotated ? f.height : f.width;
  const h = isRotated ? f.width : f.height;
  
  return {
    left: f.x,           // 左边界
    right: f.x + w,      // 右边界
    top: f.y,            // 上边界
    bottom: f.y + h,     // 下边界
    width: w,            // 实际宽度
    height: h            // 实际高度
  };
}

/**
 * 检测两个家具是否重叠
 * 使用分离轴定理的简化版本（AABB碰撞检测）
 * 注意：窗户/门允许超出房间边界，但紧贴边缘
 * 其他家具之间禁止重叠
 */
export function checkOverlap(f1: Furniture, f2: Furniture, allowWindowDoor: boolean) {
  const b1 = getBoundingBox(f1);
  const b2 = getBoundingBox(f2);

  // 如果两个矩形在任一轴上不重叠，则它们没有碰撞
  // b1.right <= b2.left：f1 在 f2 左侧
  // b1.left >= b2.right：f1 在 f2 右侧  
  // b1.bottom <= b2.top：f1 在 f2 上方
  // b1.top >= b2.bottom：f1 在 f2 下方
  return !(b1.right <= b2.left || 
           b1.left >= b2.right || 
           b1.bottom <= b2.top || 
           b1.top >= b2.bottom);
}

/**
 * 检查窗户/门是否紧贴房间边缘（允许超出但必须紧贴）
 * 紧贴即：左/上边界为0，或右/下边界等于房间宽高
 */
export function isWindowDoorTouchingEdge(f: Furniture, room: Room) {
  const b = getBoundingBox(f);
  // 窗户/门必须紧贴至少一条边
  const touchesLeft = b.left === 0;
  const touchesTop = b.top === 0;
  const touchesRight = b.right === room.width;
  const touchesBottom = b.bottom === room.height;
  return touchesLeft || touchesTop || touchesRight || touchesBottom;
}

/**
 * 检查窗户/门是否同时满足：1) 紧贴边缘 2) 不与普通家具重叠
 * 用于布局规则验证
 */
export function isValidWindowDoorPlacement(f: Furniture, room: Room, otherFurnitures: Furniture[]) {
  if (!isWindowDoorTouchingEdge(f, room)) return false;
  const b = getBoundingBox(f);
  // 检查是否与任何普通家具重叠（窗户/门之间允许重叠，但与普通家具重叠不允许）
  for (const other of otherFurnitures) {
    if (other.type === 'window' || other.type === 'door') continue;
    if (checkOverlap(f, other, false)) return false;
  }
  return true;
}

// 建议类型枚举：错误、警告、成功、信息
export type AdviceType = 'error' | 'warning' | 'success' | 'info';

// 建议项接口
export interface Advice {
  type: AdviceType;   // 建议类型（决定显示颜色和图标）
  message: string;    // 建议内容
}

/**
 * 根据房间和家具布局生成智能建议
 * 检查重叠、越界、特殊家具布局规则等
 */
export function getAdvice(room: Room, furniture: Furniture[]): Advice[] {
  const advice: Advice[] = [];

  // 1. 检查家具之间是否重叠
  let hasOverlap = false;
  for (let i = 0; i < furniture.length; i++) {
    for (let j = i + 1; j < furniture.length; j++) {
      const f1 = furniture[i];
      const f2 = furniture[j];
      // 只有当两个都不是窗户/门时才检查重叠
      const neitherIsSpecial = f1.type !== 'window' && f1.type !== 'door' &&
                               f2.type !== 'window' && f2.type !== 'door';
      if (neitherIsSpecial && checkOverlap(f1, f2, false)) {
        const types = [f1.type, f2.type];
        
        // 规则A：门被挡住是严重错误（影响通行）
        if (types.includes('door')) {
          const blocker = f1.type === 'door' ? f2.name : f1.name;
          advice.push({ type: 'error', message: `门被 ${blocker} 挡住了！` });
        } 
        // 规则B：衣柜挡住窗户是警告（影响采光）
        else if (types.includes('window') && types.includes('cabinet')) {
          advice.push({ type: 'warning', message: `衣柜可能会挡住窗户的光线。` });
        } 
        // 规则C：其他类型的重叠是错误
        else {
          hasOverlap = true;
          advice.push({ type: 'error', message: `${f1.name} 和 ${f2.name} 不能重叠（非窗户/门家具）` });
        }
      }
    }
  }

  // 2. 检查家具是否超出房间边界
  furniture.forEach(f => {
    const b = getBoundingBox(f);
    if (b.left < 0 || b.right > room.width || b.top < 0 || b.bottom > room.height) {
      advice.push({ type: 'error', message: `${f.name} 超出了房间边界。` });
    }
  });

  // 3. 特殊家具的布局建议
  
  // 床的检查：是否靠墙（节省空间且符合心理需求）
  const bed = furniture.find(f => f.type === 'bed');
  const desks = furniture.filter(f => f.type === 'desk');
  const cabinet = furniture.find(f => f.type === 'cabinet');

  if (bed) {
    const b = getBoundingBox(bed);
    // 距离任意一面墙小于等于 10cm 视为靠墙
    const nearWall = b.left <= 10 || b.right >= room.width - 10 || b.top <= 10 || b.bottom >= room.height - 10;
    if (nearWall) {
      advice.push({ type: 'success', message: '床靠墙放置，能增加安全感并节省空间。' });
    } else {
      advice.push({ type: 'warning', message: '床没有靠墙，可能会浪费空间并缺乏心理安全感。' });
    }
  }

  // 书桌检查：如果有两张书桌且距离很近，给出协作建议
  if (desks.length === 2) {
    const d1 = getBoundingBox(desks[0]);
    const d2 = getBoundingBox(desks[1]);
    
    // 计算两张书桌之间的最小距离
    const dist = Math.max(
      d1.left - d2.right,   // 水平距离（d1 在 d2 右侧时）
      d2.left - d1.right,   // 水平距离（d2 在 d1 右侧时）
      d1.top - d2.bottom,   // 垂直距离（d1 在 d2 下方时）
      d2.top - d1.bottom    // 垂直距离（d2 在 d1 下方时）
    );

    if (dist < 20 && !hasOverlap) {
      advice.push({ type: 'info', message: '两张书桌靠得很近，适合双人共同学习或工作。' });
    }
  }

  // 衣柜检查：门前是否有足够的开门空间（至少 60cm）
  if (cabinet) {
    const b = getBoundingBox(cabinet);
    // 检查衣柜是否在房间边缘（有足够空间开门）
    const hasClearance = b.left > 60 || b.right < room.width - 60 || b.top > 60 || b.bottom < room.height - 60;
    if (!hasClearance) {
      advice.push({ type: 'warning', message: '请确保柜子门前至少有 60cm 的开门空间。' });
    } else {
      advice.push({ type: 'info', message: '柜子周围空间充足，方便日常拿取衣物。' });
    }
  }

  // 如果没有生成任何建议，说明布局很合理
  if (advice.length === 0) {
    advice.push({ type: 'success', message: '当前布局看起来非常合理！' });
  }

  return advice;
}
