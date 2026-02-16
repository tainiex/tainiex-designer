# 渲染系统详细设计

## 1. 渲染流程

### 1.1 完整渲染周期

```
┌─────────────────────────────────────────────────┐
│  1. 触发渲染                                     │
│     - 数据变化                                   │
│     - 用户交互                                   │
│     - 视口变化                                   │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│  2. scheduleRender(region?)                     │
│     - 添加脏区域到 DirtyRegionManager           │
│     - 标记需要重绘                               │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│  3. RAF 回调                                     │
│     - requestAnimationFrame 触发                │
│     - 调用 render() 方法                        │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│  4. 检查脏区域                                   │
│     - isDirty() 返回 false → 跳过渲染           │
│     - isDirty() 返回 true → 继续                │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│  5. 清空 Canvas                                  │
│     - clearRect(0, 0, width, height)            │
│     - 重置变换矩阵                               │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│  6. 应用变换                                     │
│     - 缩放到 DPR                                │
│     - 应用视口变换（平移/缩放）                  │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│  7. 渲染图层                                     │
│     - 按 zIndex 排序                            │
│     - 依次调用 layer.render()                   │
│     - 捕获渲染错误                               │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│  8. 清理                                         │
│     - 清除脏标记                                 │
│     - 恢复上下文状态                             │
└─────────────────────────────────────────────────┘
```

### 1.2 渲染优化

**跳过不必要的渲染**：
```typescript
private render(): void {
  if (!this.dirtyRegionManager.isDirty()) {
    return; // 无变化，跳过渲染
  }
  // ... 渲染逻辑
}
```

**只渲染脏图层**：
```typescript
for (const layer of sortedLayers) {
  if (layer.visible && (layer.isDirty() || isFullRedraw)) {
    layer.render(this.ctx, regions);
    layer.clearDirty();
  }
}
```

## 2. 图层系统

### 2.1 图层生命周期

```typescript
// 1. 创建图层
const gridLayer = new GridLayer();

// 2. 添加到渲染器
renderer.addLayer(gridLayer);
// 内部调用: layer.setRenderer(this)

// 3. 图层接收数据
gridLayer.setSchema(schema); // 如果需要

// 4. 标记需要重绘
gridLayer.markDirty();
// 内部调用: renderer.scheduleRender()

// 5. 渲染器调用渲染
layer.render(ctx, regions);

// 6. 清除脏标记
layer.clearDirty();
```

### 2.2 GridLayer 实现

**职责**：绘制网格背景

**特点**：
- 最低层（zIndex: 0）
- 更新频率低
- 响应视口缩放

**渲染逻辑**：
```typescript
render(ctx: CanvasRenderingContext2D, regions: Rect[]): void {
  const scale = this.viewport.getScale();
  const gridSize = this.calculateGridSize(scale);
  
  // 绘制网格线
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1 / scale; // 保持线宽不变
  
  // 垂直线
  for (let x = 0; x < canvasWidth; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }
  
  // 水平线
  for (let y = 0; y < canvasHeight; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }
}
```

### 2.3 EntityLayer 实现

**职责**：绘制表实体

**特点**：
- 中间层（zIndex: 10）
- 需要 Schema 数据
- 支持选择高亮

**渲染逻辑**：
```typescript
render(ctx: CanvasRenderingContext2D, regions: Rect[]): void {
  if (!this.schema) return;
  
  for (const table of this.schema.tables.values()) {
    this.renderTable(ctx, table);
  }
}

private renderTable(ctx: CanvasRenderingContext2D, table: Table): void {
  const { x, y } = table.position;
  const width = 200;
  const headerHeight = 30;
  const rowHeight = 25;
  const totalHeight = headerHeight + table.columns.length * rowHeight;
  
  // 绘制表框
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;
  ctx.fillRect(x, y, width, totalHeight);
  ctx.strokeRect(x, y, width, totalHeight);
  
  // 绘制表头
  ctx.fillStyle = '#4a90e2';
  ctx.fillRect(x, y, width, headerHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(table.name, x + 10, y + 20);
  
  // 绘制字段
  ctx.fillStyle = '#333333';
  ctx.font = '12px sans-serif';
  table.columns.forEach((col, index) => {
    const rowY = y + headerHeight + index * rowHeight;
    
    // 主键标记
    if (col.primaryKey) {
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(x, rowY, 5, rowHeight);
    }
    
    // 字段名
    ctx.fillStyle = '#333333';
    ctx.fillText(col.name, x + 10, rowY + 17);
    
    // 字段类型
    ctx.fillStyle = '#666666';
    ctx.fillText(col.type, x + 120, rowY + 17);
  });
}
```

### 2.4 RelationshipLayer 实现

**职责**：绘制表关系连线

**特点**：
- 中下层（zIndex: 5）
- 需要计算连接点
- 支持不同关系类型

**渲染逻辑**：
```typescript
render(ctx: CanvasRenderingContext2D, regions: Rect[]): void {
  if (!this.schema) return;
  
  for (const rel of this.schema.relationships.values()) {
    this.renderRelationship(ctx, rel);
  }
}

private renderRelationship(ctx: CanvasRenderingContext2D, rel: Relationship): void {
  const sourceTable = this.schema.getTable(rel.sourceTableId);
  const targetTable = this.schema.getTable(rel.targetTableId);
  
  if (!sourceTable || !targetTable) return;
  
  // 计算连接点
  const start = this.getConnectionPoint(sourceTable, rel.sourceColumnId);
  const end = this.getConnectionPoint(targetTable, rel.targetColumnId);
  
  // 绘制连线
  ctx.strokeStyle = '#4a90e2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  
  // 贝塞尔曲线
  const midX = (start.x + end.x) / 2;
  ctx.bezierCurveTo(
    midX, start.y,
    midX, end.y,
    end.x, end.y
  );
  ctx.stroke();
  
  // 绘制箭头
  this.drawArrow(ctx, end, rel.type);
}
```

### 2.5 UILayer 实现

**职责**：绘制 UI 元素（选择框、高亮等）

**特点**：
- 最上层（zIndex: 20）
- 更新频率高
- 不受视口变换影响（部分元素）

**渲染逻辑**：
```typescript
render(ctx: CanvasRenderingContext2D, regions: Rect[]): void {
  // 绘制选择框
  if (this.selectionBox) {
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
      this.selectionBox.x,
      this.selectionBox.y,
      this.selectionBox.width,
      this.selectionBox.height
    );
    ctx.setLineDash([]);
  }
  
  // 绘制高亮
  if (this.hoveredTable) {
    const table = this.schema.getTable(this.hoveredTable);
    if (table) {
      ctx.strokeStyle = '#ffa500';
      ctx.lineWidth = 3;
      ctx.strokeRect(table.position.x, table.position.y, 200, 300);
    }
  }
}
```

## 3. 视口系统

### 3.1 坐标转换

**屏幕坐标 → 世界坐标**：
```typescript
screenToWorld(screenX: number, screenY: number): Point {
  return {
    x: (screenX - this.offsetX) / this.scale,
    y: (screenY - this.offsetY) / this.scale
  };
}
```

**世界坐标 → 屏幕坐标**：
```typescript
worldToScreen(worldX: number, worldY: number): Point {
  return {
    x: worldX * this.scale + this.offsetX,
    y: worldY * this.scale + this.offsetY
  };
}
```

### 3.2 平移

```typescript
pan(dx: number, dy: number): void {
  this.offsetX += dx;
  this.offsetY += dy;
  // 触发重绘
  this.renderer.scheduleRender();
}
```

### 3.3 缩放

**以鼠标位置为中心缩放**：
```typescript
zoom(deltaScale: number, centerX: number, centerY: number): void {
  const oldScale = this.scale;
  
  // 限制缩放范围
  this.scale = Math.max(
    this.MIN_SCALE,
    Math.min(this.MAX_SCALE, this.scale * (1 + deltaScale))
  );
  
  // 调整偏移量，使缩放中心保持不变
  const scaleRatio = this.scale / oldScale;
  this.offsetX = centerX - (centerX - this.offsetX) * scaleRatio;
  this.offsetY = centerY - (centerY - this.offsetY) * scaleRatio;
  
  // 触发重绘
  this.renderer.scheduleRender();
}
```

**数学原理**：
```
设缩放前鼠标位置为 (mx, my)
世界坐标为 (wx, wy)

缩放前：wx = (mx - offsetX) / oldScale
缩放后：wx = (mx - newOffsetX) / newScale

要保持 wx 不变：
(mx - offsetX) / oldScale = (mx - newOffsetX) / newScale

解得：
newOffsetX = mx - (mx - offsetX) * (newScale / oldScale)
```

## 4. 脏区域管理

### 4.1 脏区域类型

**全屏脏区域**：
```typescript
scheduleRender(); // 无参数
// 内部：addRegion({ x: 0, y: 0, width: Infinity, height: Infinity })
```

**局部脏区域**：
```typescript
scheduleRender({ x: 100, y: 100, width: 200, height: 300 });
```

### 4.2 区域合并

**简单实现（包围盒）**：
```typescript
private mergeRegions(regions: Rect[]): Rect[] {
  if (regions.length === 0) return [];
  
  // 检查是否有全屏脏区域
  if (regions.some(r => r.width === Infinity)) {
    return [{ x: 0, y: 0, width: Infinity, height: Infinity }];
  }
  
  // 计算包围盒
  const minX = Math.min(...regions.map(r => r.x));
  const minY = Math.min(...regions.map(r => r.y));
  const maxX = Math.max(...regions.map(r => r.x + r.width));
  const maxY = Math.max(...regions.map(r => r.y + r.height));
  
  return [{
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }];
}
```

**优化实现（四叉树）**：
```typescript
// TODO: 使用四叉树优化大量小区域的合并
// 适用于复杂场景，当前简单实现已足够
```

## 5. 高 DPI 支持

### 5.1 设置物理像素

```typescript
private setupHighDPI(): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = this.canvas.getBoundingClientRect();
  
  // 设置物理像素大小
  this.canvas.width = rect.width * dpr;
  this.canvas.height = rect.height * dpr;
  
  // CSS 像素大小保持不变
  this.canvas.style.width = `${rect.width}px`;
  this.canvas.style.height = `${rect.height}px`;
}
```

### 5.2 渲染时缩放

```typescript
private render(): void {
  // ...
  const dpr = window.devicePixelRatio || 1;
  this.ctx.scale(dpr, dpr); // 缩放到物理像素
  
  // 应用视口变换
  this.viewport.applyTransform(this.ctx);
  
  // 渲染图层...
}
```

### 5.3 注意事项

- 线宽需要除以 scale 保持视觉一致
- 文字大小需要考虑 DPR
- 图片需要提供 @2x 版本

## 6. 性能监控

### 6.1 FPS 计数器

```typescript
class FPSCounter {
  private frames: number = 0;
  private lastTime: number = performance.now();
  private fps: number = 0;
  
  update(): void {
    this.frames++;
    const now = performance.now();
    
    if (now - this.lastTime >= 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.lastTime = now;
      console.log(`FPS: ${this.fps}`);
    }
  }
}
```

### 6.2 渲染时间统计

```typescript
private render(): void {
  const startTime = performance.now();
  
  // 渲染逻辑...
  
  const endTime = performance.now();
  const renderTime = endTime - startTime;
  
  if (renderTime > 16.67) { // 超过一帧时间
    console.warn(`Slow render: ${renderTime.toFixed(2)}ms`);
  }
}
```

## 7. 调试技巧

### 7.1 可视化脏区域

```typescript
private renderDebugInfo(ctx: CanvasRenderingContext2D): void {
  const regions = this.dirtyRegionManager.getRegions();
  
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  
  for (const region of regions) {
    if (region.width !== Infinity) {
      ctx.strokeRect(region.x, region.y, region.width, region.height);
    }
  }
}
```

### 7.2 图层边界

```typescript
private renderLayerBounds(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = 'blue';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  
  for (const layer of this.layers) {
    const bounds = layer.getBounds();
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }
  
  ctx.setLineDash([]);
}
```

### 7.3 性能分析

```typescript
console.time('render');
this.render();
console.timeEnd('render');

console.time('layer-entity');
entityLayer.render(ctx, regions);
console.timeEnd('layer-entity');
```
