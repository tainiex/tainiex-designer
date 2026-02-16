# 交互系统详细设计

## 1. 交互架构

### 1.1 系统组成

```
┌─────────────────────────────────────────┐
│         DOM Events                      │
│  (mousedown, mousemove, mouseup, etc.)  │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│      InteractionManager                 │
│  - 事件监听和分发                        │
│  - 工具切换管理                          │
│  - 快捷键处理                            │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│         Current Tool                    │
│  - SelectTool                           │
│  - PanTool                              │
│  - RelationshipTool                     │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│      Data Model / Viewport              │
│  - 修改 Schema                          │
│  - 修改 Viewport                        │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│         Rendering                       │
│  - 标记脏区域                            │
│  - 触发重绘                              │
└─────────────────────────────────────────┘
```

## 2. InteractionManager

### 2.1 职责

- 监听 Canvas 和文档的事件
- 管理工具的切换
- 分发事件到当前激活的工具
- 处理全局快捷键

### 2.2 工具管理

```typescript
export type ToolType = 'select' | 'pan' | 'table' | 'relationship';

class InteractionManager {
  private currentTool: ToolType = 'select';
  private tools: Map<ToolType, BaseTool> = new Map();
  
  setTool(tool: ToolType): void {
    // 1. 停用旧工具
    const oldTool = this.tools.get(this.currentTool);
    if (oldTool && oldTool.deactivate) {
      oldTool.deactivate();
    }
    
    // 2. 切换工具
    this.currentTool = tool;
    
    // 3. 激活新工具
    const newTool = this.tools.get(tool);
    if (newTool && newTool.activate) {
      newTool.activate();
    }
    
    // 4. 发送事件通知 UI
    window.dispatchEvent(new CustomEvent('tool-changed', {
      detail: { type: tool }
    }));
  }
}
```

### 2.3 事件分发

```typescript
private bindEvents(): void {
  const canvas = this.renderer.getCanvas();
  
  // Canvas 事件
  canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
  canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
  canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
  
  // 文档事件（全局）
  document.addEventListener('keydown', this.onKeyDown.bind(this));
  document.addEventListener('keyup', this.onKeyUp.bind(this));
}

private onMouseDown(e: MouseEvent): void {
  const tool = this.tools.get(this.currentTool);
  if (tool) {
    tool.onMouseDown(e);
  }
}
```

### 2.4 快捷键处理

```typescript
private onKeyDown(e: KeyboardEvent): void {
  // 空格键 - 临时切换到平移工具
  if (e.key === ' ' && this.currentTool !== 'pan') {
    e.preventDefault();
    this.previousTool = this.currentTool;
    this.setTool('pan');
  }
  
  // Ctrl/Cmd + Z - 撤销
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    this.undo();
  }
  
  // Delete - 删除选中
  if (e.key === 'Delete') {
    e.preventDefault();
    this.deleteSelected();
  }
}

private onKeyUp(e: KeyboardEvent): void {
  // 释放空格键 - 恢复之前的工具
  if (e.key === ' ' && this.previousTool) {
    e.preventDefault();
    this.setTool(this.previousTool);
    this.previousTool = null;
  }
}
```

## 3. BaseTool

### 3.1 工具接口

```typescript
export abstract class BaseTool {
  protected viewport: Viewport;
  protected canvas: HTMLCanvasElement;
  
  constructor(viewport: Viewport, canvas: HTMLCanvasElement) {
    this.viewport = viewport;
    this.canvas = canvas;
  }
  
  // 生命周期方法（可选）
  activate?(): void;
  deactivate?(): void;
  
  // 事件处理方法（必须实现）
  abstract onMouseDown(e: MouseEvent): void;
  abstract onMouseMove(e: MouseEvent): void;
  abstract onMouseUp(e: MouseEvent): void;
  
  // 工具方法
  protected getWorldPosition(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return this.viewport.screenToWorld(screenX, screenY);
  }
  
  protected getScreenPosition(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }
}
```

## 4. SelectTool

### 4.1 功能

- 选择表
- 拖拽移动表
- 多选（Ctrl + 点击）
- 框选（拖拽选择框）

### 4.2 状态机

```
┌─────────┐
│  Idle   │ ◄──────────────────┐
└────┬────┘                    │
     │ mousedown on table      │
     ↓                         │
┌─────────┐                    │
│Dragging │                    │
└────┬────┘                    │
     │ mousemove              │
     ↓                         │
┌─────────┐                    │
│ Moving  │                    │
└────┬────┘                    │
     │ mouseup                │
     └────────────────────────┘
```

### 4.3 实现

```typescript
export class SelectTool extends BaseTool {
  private isDragging: boolean = false;
  private dragStartPos: Point | null = null;
  private draggedTable: Table | null = null;
  private selectedTables: Set<string> = new Set();
  
  onMouseDown(e: MouseEvent): void {
    const worldPos = this.getWorldPosition(e);
    const table = this.findTableAt(worldPos);
    
    if (table) {
      // 点击到表
      if (e.ctrlKey || e.metaKey) {
        // 多选模式
        this.toggleSelection(table.id);
      } else {
        // 单选模式
        if (!this.selectedTables.has(table.id)) {
          this.selectedTables.clear();
          this.selectedTables.add(table.id);
        }
      }
      
      // 开始拖拽
      this.isDragging = true;
      this.dragStartPos = worldPos;
      this.draggedTable = table;
      
      // 发送选择变化事件
      this.emitSelectionChanged();
    } else {
      // 点击空白处
      if (!e.ctrlKey && !e.metaKey) {
        this.selectedTables.clear();
        this.emitSelectionChanged();
      }
    }
  }
  
  onMouseMove(e: MouseEvent): void {
    if (this.isDragging && this.draggedTable && this.dragStartPos) {
      const worldPos = this.getWorldPosition(e);
      const dx = worldPos.x - this.dragStartPos.x;
      const dy = worldPos.y - this.dragStartPos.y;
      
      // 移动所有选中的表
      for (const tableId of this.selectedTables) {
        const table = this.schema.getTable(tableId);
        if (table) {
          table.position.x += dx;
          table.position.y += dy;
        }
      }
      
      this.dragStartPos = worldPos;
      
      // 标记需要重绘
      this.entityLayer.markDirty();
      this.renderer.scheduleRender();
    }
  }
  
  onMouseUp(e: MouseEvent): void {
    this.isDragging = false;
    this.dragStartPos = null;
    this.draggedTable = null;
  }
  
  private findTableAt(pos: Point): Table | null {
    for (const table of this.schema.tables.values()) {
      if (this.isPointInTable(pos, table)) {
        return table;
      }
    }
    return null;
  }
  
  private isPointInTable(pos: Point, table: Table): boolean {
    const width = 200;
    const height = 30 + table.columns.length * 25;
    
    return pos.x >= table.position.x &&
           pos.x <= table.position.x + width &&
           pos.y >= table.position.y &&
           pos.y <= table.position.y + height;
  }
  
  private emitSelectionChanged(): void {
    window.dispatchEvent(new CustomEvent('selection-changed', {
      detail: { tableIds: Array.from(this.selectedTables) }
    }));
  }
}
```

## 5. PanTool

### 5.1 功能

- 拖拽平移画布
- 修改视口偏移量

### 5.2 实现

```typescript
export class PanTool extends BaseTool {
  private isPanning: boolean = false;
  private lastPos: Point | null = null;
  
  activate(): void {
    // 改变鼠标样式
    this.canvas.style.cursor = 'grab';
  }
  
  deactivate(): void {
    // 恢复鼠标样式
    this.canvas.style.cursor = 'default';
  }
  
  onMouseDown(e: MouseEvent): void {
    this.isPanning = true;
    this.lastPos = this.getScreenPosition(e);
    this.canvas.style.cursor = 'grabbing';
  }
  
  onMouseMove(e: MouseEvent): void {
    if (this.isPanning && this.lastPos) {
      const currentPos = this.getScreenPosition(e);
      const dx = currentPos.x - this.lastPos.x;
      const dy = currentPos.y - this.lastPos.y;
      
      // 平移视口
      this.viewport.pan(dx, dy);
      
      this.lastPos = currentPos;
      
      // 触发重绘
      this.renderer.scheduleRender();
    }
  }
  
  onMouseUp(e: MouseEvent): void {
    this.isPanning = false;
    this.lastPos = null;
    this.canvas.style.cursor = 'grab';
  }
}
```

## 6. RelationshipTool

### 6.1 功能

- 从源表拖拽到目标表
- 创建表关系
- 显示预览线

### 6.2 状态机

```
┌─────────┐
│  Idle   │ ◄──────────────────┐
└────┬────┘                    │
     │ mousedown on table      │
     ↓                         │
┌─────────┐                    │
│ Drawing │                    │
└────┬────┘                    │
     │ mousemove              │
     ↓                         │
┌─────────┐                    │
│Preview  │                    │
└────┬────┘                    │
     │ mouseup on table       │
     ↓                         │
┌─────────┐                    │
│ Create  │                    │
└────┬────┘                    │
     │                         │
     └────────────────────────┘
```

### 6.3 实现

```typescript
export class RelationshipTool extends BaseTool {
  private isDrawing: boolean = false;
  private sourceTable: Table | null = null;
  private currentPos: Point | null = null;
  
  onMouseDown(e: MouseEvent): void {
    const worldPos = this.getWorldPosition(e);
    const table = this.findTableAt(worldPos);
    
    if (table) {
      this.isDrawing = true;
      this.sourceTable = table;
      this.currentPos = worldPos;
    }
  }
  
  onMouseMove(e: MouseEvent): void {
    if (this.isDrawing && this.sourceTable) {
      this.currentPos = this.getWorldPosition(e);
      
      // 在 UILayer 显示预览线
      this.uiLayer.setPreviewLine(
        this.getTableCenter(this.sourceTable),
        this.currentPos
      );
      
      this.uiLayer.markDirty();
      this.renderer.scheduleRender();
    }
  }
  
  onMouseUp(e: MouseEvent): void {
    if (this.isDrawing && this.sourceTable) {
      const worldPos = this.getWorldPosition(e);
      const targetTable = this.findTableAt(worldPos);
      
      if (targetTable && targetTable.id !== this.sourceTable.id) {
        // 创建关系
        this.createRelationship(this.sourceTable, targetTable);
      }
      
      // 清除预览
      this.uiLayer.clearPreviewLine();
      this.uiLayer.markDirty();
      
      this.isDrawing = false;
      this.sourceTable = null;
      this.currentPos = null;
      
      this.renderer.scheduleRender();
    }
  }
  
  private createRelationship(source: Table, target: Table): void {
    // 简化版：使用第一个字段
    const sourceCol = source.columns[0];
    const targetCol = target.columns[0];
    
    if (!sourceCol || !targetCol) return;
    
    const rel = new Relationship(
      generateId(),
      'one-to-many',
      source.id,
      target.id,
      sourceCol.id,
      targetCol.id
    );
    
    this.schema.addRelationship(rel);
    
    // 标记关系层需要重绘
    this.relationshipLayer.markDirty();
  }
  
  private getTableCenter(table: Table): Point {
    const width = 200;
    const height = 30 + table.columns.length * 25;
    
    return {
      x: table.position.x + width / 2,
      y: table.position.y + height / 2
    };
  }
}
```

## 7. 事件系统

### 7.1 自定义事件

**selection-changed**：
```typescript
// 发送
window.dispatchEvent(new CustomEvent('selection-changed', {
  detail: { tableIds: ['table-1', 'table-2'] }
}));

// 监听
window.addEventListener('selection-changed', (e: any) => {
  const tableIds = e.detail.tableIds;
  console.log('Selected tables:', tableIds);
});
```

**tool-changed**：
```typescript
// 发送
window.dispatchEvent(new CustomEvent('tool-changed', {
  detail: { type: 'select' }
}));

// 监听
window.addEventListener('tool-changed', (e: any) => {
  const toolType = e.detail.type;
  updateToolbarUI(toolType);
});
```

### 7.2 事件流

```
用户点击表
  ↓
SelectTool.onMouseDown()
  ↓
修改 selectedTables
  ↓
emitSelectionChanged()
  ↓
window.dispatchEvent('selection-changed')
  ↓
PropertyPanel 监听到事件
  ↓
PropertyPanel.showTable()
  ↓
更新 UI 显示
```

## 8. 碰撞检测

### 8.1 点与矩形

```typescript
function isPointInRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.x &&
         point.x <= rect.x + rect.width &&
         point.y >= rect.y &&
         point.y <= rect.y + rect.height;
}
```

### 8.2 矩形与矩形

```typescript
function isRectOverlap(rect1: Rect, rect2: Rect): boolean {
  return !(rect1.x + rect1.width < rect2.x ||
           rect2.x + rect2.width < rect1.x ||
           rect1.y + rect1.height < rect2.y ||
           rect2.y + rect2.height < rect1.y);
}
```

### 8.3 优化：空间索引

**四叉树**：
```typescript
class QuadTree {
  private bounds: Rect;
  private capacity: number = 4;
  private objects: Table[] = [];
  private divided: boolean = false;
  private children: QuadTree[] = [];
  
  insert(table: Table): boolean {
    if (!this.contains(table.position)) {
      return false;
    }
    
    if (this.objects.length < this.capacity) {
      this.objects.push(table);
      return true;
    }
    
    if (!this.divided) {
      this.subdivide();
    }
    
    for (const child of this.children) {
      if (child.insert(table)) {
        return true;
      }
    }
    
    return false;
  }
  
  query(range: Rect): Table[] {
    const found: Table[] = [];
    
    if (!this.intersects(range)) {
      return found;
    }
    
    for (const obj of this.objects) {
      if (isPointInRect(obj.position, range)) {
        found.push(obj);
      }
    }
    
    if (this.divided) {
      for (const child of this.children) {
        found.push(...child.query(range));
      }
    }
    
    return found;
  }
}
```

## 9. 性能优化

### 9.1 事件节流

```typescript
function throttle(fn: Function, delay: number) {
  let lastCall = 0;
  return function(...args: any[]) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

// 使用
canvas.addEventListener('mousemove', throttle((e: MouseEvent) => {
  this.onMouseMove(e);
}, 16)); // 约 60fps
```

### 9.2 事件防抖

```typescript
function debounce(fn: Function, delay: number) {
  let timeoutId: number;
  return function(...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// 使用
window.addEventListener('resize', debounce(() => {
  this.renderer.resize();
}, 200));
```

### 9.3 Passive 事件监听

```typescript
canvas.addEventListener('wheel', (e: WheelEvent) => {
  // 处理滚轮事件
}, { passive: false }); // 需要 preventDefault

canvas.addEventListener('touchmove', (e: TouchEvent) => {
  // 处理触摸事件
}, { passive: true }); // 不需要 preventDefault，提升性能
```

## 10. 调试技巧

### 10.1 可视化碰撞盒

```typescript
private renderDebugBounds(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  
  for (const table of this.schema.tables.values()) {
    const bounds = this.getTableBounds(table);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }
  
  ctx.setLineDash([]);
}
```

### 10.2 日志事件

```typescript
onMouseDown(e: MouseEvent): void {
  console.log('MouseDown:', {
    screen: { x: e.clientX, y: e.clientY },
    world: this.getWorldPosition(e),
    button: e.button,
    ctrlKey: e.ctrlKey
  });
  
  // 处理逻辑...
}
```

### 10.3 状态监控

```typescript
class ToolStateMonitor {
  private states: Map<string, any> = new Map();
  
  setState(key: string, value: any): void {
    this.states.set(key, value);
    console.log(`State changed: ${key} =`, value);
  }
  
  getState(key: string): any {
    return this.states.get(key);
  }
  
  logAllStates(): void {
    console.table(Array.from(this.states.entries()));
  }
}
```
