# Tainiex Designer - LLM Agent 开发文档

本文档为 LLM Agent 提供项目的详细架构说明、API 文档和开发规范。

## 项目概述

Tainiex Designer 是一个跨平台的数据库建模工具，采用 **Tauri 2.10 + Vanilla TypeScript + Canvas 2D** 架构实现高性能图形渲染和交互。

### 核心设计理念

1. **性能优先** - 使用 Canvas 2D 原生 API，避免框架开销
2. **分层架构** - 渲染、模型、交互、持久化分层解耦
3. **局部重绘** - 通过脏区域管理优化渲染性能
4. **类型安全** - TypeScript 严格模式，完整的类型定义
5. **事件驱动** - 基于自定义事件的组件通信

### 技术栈

**前端**
- TypeScript 5.6 (strict mode)
- Vite 6.0 (构建工具)
- Canvas 2D API (渲染)
- 无框架依赖

**后端**
- Tauri 2.10 (桌面框架)
- Rust (系统编程)

**开发工具**
- ESLint (代码检查)
- Chrome DevTools (调试)

## 架构设计

### 1. 渲染引擎 (Renderer Layer)

#### 1.1 核心类：Renderer

**职责**: 管理 Canvas 渲染循环、分层渲染调度、视口变换

**文件**: `src/renderer/Renderer.ts`

```typescript
class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layers: Layer[] = [];
  private viewport: Viewport;
  private dirtyRegionManager: DirtyRegionManager;
  private animationFrameId: number | null = null;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.viewport = new Viewport();
    this.dirtyRegionManager = new DirtyRegionManager();
  }
  
  // 启动渲染循环
  start(): void {
    const loop = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }
  
  // 主渲染方法
  private render(): void {
    const dirtyRegions = this.dirtyRegionManager.getRegions();
    
    if (dirtyRegions.length === 0) return; // 无需渲染
    
    // 应用视口变换
    this.ctx.save();
    this.viewport.applyTransform(this.ctx);
    
    // 按层级顺序渲染
    for (const layer of this.layers.sort((a, b) => a.zIndex - b.zIndex)) {
      if (layer.isDirty()) {
        layer.render(this.ctx, dirtyRegions);
      }
    }
    
    this.ctx.restore();
    this.dirtyRegionManager.clear();
  }
  
  // 标记需要重绘
  scheduleRender(region?: Rect): void {
    this.dirtyRegionManager.addRegion(region);
  }
  
  // 添加图层
  addLayer(layer: Layer): void {
    this.layers.push(layer);
    layer.setRenderer(this);
  }
}
```

**关键方法**:
- `start()` - 启动 RAF 循环
- `stop()` - 停止渲染循环
- `render()` - 主渲染逻辑（私有）
- `scheduleRender(region?)` - 标记脏区域
- `addLayer(layer)` - 注册图层
- `removeLayer(layer)` - 移除图层
- `resize()` - 调整 Canvas 尺寸（支持高 DPI）
- `getViewport()` - 获取视口对象
- `getCanvas()` - 获取 Canvas 元素

**高 DPI 支持**:
```typescript
private setupHighDPI(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    // 物理像素
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    // CSS 像素
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
}
```

---

#### 1.2 分层系统：Layer

**职责**: 抽象图层基类，定义渲染接口

**文件**: `src/renderer/Layer.ts`

```typescript
abstract class Layer {
  protected renderer: Renderer | null = null;
  protected dirty: boolean = true;
  public zIndex: number = 0;
  
  setRenderer(renderer: Renderer): void {
    this.renderer = renderer;
  }
  
  // 子类实现具体渲染逻辑
  abstract render(ctx: CanvasRenderingContext2D, regions: Rect[]): void;
  
  // 标记为脏
  markDirty(region?: Rect): void {
    this.dirty = true;
    if (this.renderer) {
      this.renderer.scheduleRender(region);
    }
  }
  
  isDirty(): boolean {
    return this.dirty;
  }
  
  clearDirty(): void {
    this.dirty = false;
  }
}
```

**具体图层实现**:

1. **GridLayer** (`src/renderer/layers/GridLayer.ts`)
   - zIndex: 0
   - 绘制网格背景
   - 响应缩放级别动态调整网格密度
   - 使用浅灰色线条

2. **RelationshipLayer** (`src/renderer/layers/RelationshipLayer.ts`)
   - zIndex: 5
   - 绘制表之间的连线
   - 支持不同关系类型 (1:1, 1:N, N:M)
   - 需要通过 `setSchema()` 设置数据源

3. **EntityLayer** (`src/renderer/layers/EntityLayer.ts`)
   - zIndex: 10
   - 绘制表/实体
   - 包含表名、字段列表、主键/外键标记
   - 需要通过 `setSchema()` 设置数据源
   - 支持表的拖拽移动

4. **UILayer** (`src/renderer/layers/UILayer.ts`)
   - zIndex: 20
   - 绘制选择框、高亮、拖拽预览等 UI 元素
   - 最上层，不受视口变换影响的 UI 元素

---

#### 1.3 视口变换：Viewport

**职责**: 管理画布的平移和缩放

**文件**: `src/renderer/Viewport.ts`

```typescript
class Viewport {
  private offsetX: number = 0;
  private offsetY: number = 0;
  private scale: number = 1.0;
  
  // 应用变换到 Canvas 上下文
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);
  }
  
  // 屏幕坐标 → 世界坐标
  screenToWorld(screenX: number, screenY: number): { x: number, y: number } {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale
    };
  }
  
  // 世界坐标 → 屏幕坐标
  worldToScreen(worldX: number, worldY: number): { x: number, y: number } {
    return {
      x: worldX * this.scale + this.offsetX,
      y: worldY * this.scale + this.offsetY
    };
  }
  
  // 平移
  pan(dx: number, dy: number): void {
    this.offsetX += dx;
    this.offsetY += dy;
  }
  
  // 缩放
  zoom(deltaScale: number, centerX: number, centerY: number): void {
    const oldScale = this.scale;
    this.scale = Math.max(
      this.MIN_SCALE,
      Math.min(this.MAX_SCALE, this.scale * (1 + deltaScale))
    );
    
    // 以指定点为中心缩放
    const scaleRatio = this.scale / oldScale;
    this.offsetX = centerX - (centerX - this.offsetX) * scaleRatio;
    this.offsetY = centerY - (centerY - this.offsetY) * scaleRatio;
  }
  
  // 重置视口
  reset(): void {
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1.0;
  }
  
  // 获取当前缩放级别
  getScale(): number {
    return this.scale;
  }
  
  // 获取当前偏移量
  getOffset(): Point {
    return { x: this.offsetX, y: this.offsetY };
  }
}
```

---

#### 1.4 脏区域管理：DirtyRegionManager

**职责**: 收集和合并脏区域，优化重绘

**文件**: `src/renderer/DirtyRegionManager.ts`

```typescript
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

class DirtyRegionManager {
  private regions: Rect[] = [];
  private dirty: boolean = false;
  
  addRegion(region?: Rect): void {
    this.dirty = true;
    if (!region) {
      // 全屏脏区域
      this.regions = [{ x: 0, y: 0, width: Infinity, height: Infinity }];
    } else {
      this.regions.push(region);
    }
  }
  
  getRegions(): Rect[] {
    return this.mergeRegions(this.regions);
  }
  
  clear(): void {
    this.regions = [];
    this.dirty = false;
  }
  
  isDirty(): boolean {
    return this.dirty;
  }
  
  // 合并重叠的矩形区域
  private mergeRegions(regions: Rect[]): Rect[] {
    if (regions.length === 0) return [];
    if (regions.some(r => r.width === Infinity)) {
      return [{ x: 0, y: 0, width: Infinity, height: Infinity }];
    }
    
    // 计算包围盒（简单实现）
    const minX = Math.min(...regions.map(r => r.x));
    const minY = Math.min(...regions.map(r => r.y));
    const maxX = Math.max(...regions.map(r => r.x + r.width));
    const maxY = Math.max(...regions.map(r => r.y + r.height));
    
    return [{ x: minX, y: minY, width: maxX - minX, height: maxY - minY }];
  }
}
```

---

### 2. 数据模型层 (Model Layer)

#### 2.1 Schema

**文件**: `src/models/Schema.ts`

```typescript
class Schema {
  name: string;
  tables: Map<string, Table> = new Map();
  relationships: Map<string, Relationship> = new Map();
  metadata: Record<string, any> = {};
  
  addTable(table: Table): void {
    this.tables.set(table.id, table);
  }
  
  removeTable(id: string): void {
    this.tables.delete(id);
    // 同时删除相关的关系
    for (const [relId, rel] of this.relationships) {
      if (rel.sourceTableId === id || rel.targetTableId === id) {
        this.relationships.delete(relId);
      }
    }
  }
  
  addRelationship(rel: Relationship): void {
    this.relationships.set(rel.id, rel);
  }
  
  toJSON(): object {
    return {
      name: this.name,
      tables: Array.from(this.tables.values()).map(t => t.toJSON()),
      relationships: Array.from(this.relationships.values()).map(r => r.toJSON()),
      metadata: this.metadata
    };
  }
  
  static fromJSON(json: any): Schema {
    const schema = new Schema();
    schema.name = json.name;
    schema.metadata = json.metadata || {};
    
    for (const tableData of json.tables || []) {
      const table = Table.fromJSON(tableData);
      schema.addTable(table);
    }
    
    for (const relData of json.relationships || []) {
      const rel = Relationship.fromJSON(relData);
      schema.addRelationship(rel);
    }
    
    return schema;
  }
}
```

---

#### 2.2 Table

**文件**: `src/models/Table.ts`

```typescript
class Table {
  id: string;
  name: string;
  position: { x: number, y: number };
  columns: Column[] = [];
  indexes: Index[] = [];
  constraints: Constraint[] = [];
  comment?: string;
  
  constructor(id: string, name: string, x: number, y: number) {
    this.id = id;
    this.name = name;
    this.position = { x, y };
  }
  
  addColumn(column: Column): void {
    this.columns.push(column);
  }
  
  removeColumn(columnId: string): void {
    this.columns = this.columns.filter(c => c.id !== columnId);
  }
  
  getColumn(columnId: string): Column | undefined {
    return this.columns.find((c) => c.id === columnId);
  }
  
  getPrimaryKeys(): Column[] {
    return this.columns.filter((c) => c.primaryKey);
  }

  getForeignKeys(): Column[] {
    return this.columns.filter((c) => c.foreignKey);
  }

  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      position: this.position,
      columns: this.columns.map((c) => c.toJSON()),
      indexes: this.indexes,
      constraints: this.constraints,
      comment: this.comment,
    };
  }

  static fromJSON(json: any): Table {
    const table = new Table(
      json.id,
      json.name,
      json.position.x,
      json.position.y
    );
    table.comment = json.comment;
    table.indexes = json.indexes || [];
    table.constraints = json.constraints || [];

    for (const colData of json.columns || []) {
      table.addColumn(Column.fromJSON(colData));
    }

    return table;
  }
  
  // 工厂方法：创建新表
  static create(name: string, x: number, y: number): Table {
    return new Table(generateId(), name, x, y);
  }
}
```

---

#### 2.3 Column

**文件**: `src/models/Column.ts`

```typescript
class Column {
  id: string;
  name: string;
  type: string; // 例如: VARCHAR(255), INT, TIMESTAMP
  nullable: boolean = true;
  primaryKey: boolean = false;
  foreignKey: boolean = false;
  unique: boolean = false;
  autoIncrement: boolean = false;
  defaultValue?: string;
  comment?: string;
  
  constructor(id: string, name: string, type: string) {
    this.id = id;
    this.name = name;
    this.type = type;
  }
  
  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      nullable: this.nullable,
      primaryKey: this.primaryKey,
      foreignKey: this.foreignKey,
      unique: this.unique,
      autoIncrement: this.autoIncrement,
      defaultValue: this.defaultValue,
      comment: this.comment
    };
  }
  
  static fromJSON(json: any): Column {
    const col = new Column(json.id, json.name, json.type);
    col.nullable = json.nullable ?? true;
    col.primaryKey = json.primaryKey ?? false;
    col.foreignKey = json.foreignKey ?? false;
    col.unique = json.unique ?? false;
    col.autoIncrement = json.autoIncrement ?? false;
    col.defaultValue = json.defaultValue;
    col.comment = json.comment;
    return col;
  }
}
```

---

#### 2.4 Relationship

**文件**: `src/models/Relationship.ts`

```typescript
type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-many';

class Relationship {
  id: string;
  type: RelationType;
  sourceTableId: string;
  targetTableId: string;
  sourceColumnId: string;
  targetColumnId: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  
  constructor(
    id: string,
    type: RelationType,
    sourceTableId: string,
    targetTableId: string,
    sourceColumnId: string,
    targetColumnId: string
  ) {
    this.id = id;
    this.type = type;
    this.sourceTableId = sourceTableId;
    this.targetTableId = targetTableId;
    this.sourceColumnId = sourceColumnId;
    this.targetColumnId = targetColumnId;
  }
  
  toJSON(): object {
    return {
      id: this.id,
      type: this.type,
      sourceTableId: this.sourceTableId,
      targetTableId: this.targetTableId,
      sourceColumnId: this.sourceColumnId,
      targetColumnId: this.targetColumnId,
      onDelete: this.onDelete,
      onUpdate: this.onUpdate
    };
  }
  
  static fromJSON(json: any): Relationship {
    const rel = new Relationship(
      json.id,
      json.type,
      json.sourceTableId,
      json.targetTableId,
      json.sourceColumnId,
      json.targetColumnId
    );
    rel.onDelete = json.onDelete;
    rel.onUpdate = json.onUpdate;
    return rel;
  }
}
```

---

### 3. 交互系统 (Interaction Layer)

#### 3.1 InteractionManager

**职责**: 处理鼠标/键盘事件，分发到具体工具

**文件**: `src/interactions/InteractionManager.ts`

```typescript
export type ToolType = 'select' | 'pan' | 'table' | 'relationship';

class InteractionManager {
  private currentTool: ToolType = 'select';
  private tools: Map<ToolType, BaseTool> = new Map();
  private renderer: Renderer;
  
  constructor(
    renderer: Renderer,
    entityLayer: EntityLayer,
    relationshipLayer: RelationshipLayer,
    uiLayer: UILayer,
    schema: Schema
  ) {
    this.renderer = renderer;
    this.initTools(entityLayer, relationshipLayer, uiLayer, schema);
    this.bindEvents();
  }
  
  private initTools(
    entityLayer: EntityLayer,
    relationshipLayer: RelationshipLayer,
    uiLayer: UILayer,
    schema: Schema
  ): void {
    const viewport = this.renderer.getViewport();
    const canvas = this.renderer.getCanvas();
    
    this.tools.set('select', new SelectTool(viewport, canvas, entityLayer, schema));
    this.tools.set('pan', new PanTool(viewport, canvas, this.renderer));
    this.tools.set('relationship', new RelationshipTool(
      viewport,
      canvas,
      entityLayer,
      relationshipLayer,
      uiLayer,
      schema
    ));
  }
  
  setTool(tool: ToolType): void {
    // 通知旧工具停用
    const oldTool = this.tools.get(this.currentTool);
    if (oldTool) {
      oldTool.deactivate?.();
    }
    
    this.currentTool = tool;
    
    // 通知新工具激活
    const newTool = this.tools.get(tool);
    if (newTool) {
      newTool.activate?.();
    }
    
    // 发送工具切换事件
    window.dispatchEvent(new CustomEvent('tool-changed', { 
      detail: { type: tool } 
    }));
  }
  
  private bindEvents(): void {
    const canvas = this.renderer.getCanvas();
    
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
  }
  
  private onMouseDown(e: MouseEvent): void {
    const tool = this.tools.get(this.currentTool);
    if (tool) {
      tool.onMouseDown(e);
    }
  }
  
  private onMouseMove(e: MouseEvent): void {
    const tool = this.tools.get(this.currentTool);
    if (tool) {
      tool.onMouseMove(e);
    }
  }
  
  private onMouseUp(e: MouseEvent): void {
    const tool = this.tools.get(this.currentTool);
    if (tool) {
      tool.onMouseUp(e);
    }
  }
  
  private onKeyDown(e: KeyboardEvent): void {
    // 空格键临时切换到平移工具
    if (e.key === ' ' && this.currentTool !== 'pan') {
      e.preventDefault();
      this.setTool('pan');
    }
  }
  
  private onKeyUp(e: KeyboardEvent): void {
    // 释放空格键恢复之前的工具
    if (e.key === ' ') {
      e.preventDefault();
      this.setTool('select');
    }
  }
}
```

#### 3.2 BaseTool

**职责**: 工具基类，定义工具接口

**文件**: `src/interactions/BaseTool.ts`

```typescript
export abstract class BaseTool {
  protected viewport: Viewport;
  protected canvas: HTMLCanvasElement;
  
  constructor(viewport: Viewport, canvas: HTMLCanvasElement) {
    this.viewport = viewport;
    this.canvas = canvas;
  }
  
  // 生命周期方法
  activate?(): void;
  deactivate?(): void;
  
  // 事件处理方法
  abstract onMouseDown(e: MouseEvent): void;
  abstract onMouseMove(e: MouseEvent): void;
  abstract onMouseUp(e: MouseEvent): void;
  
  // 工具方法：获取鼠标世界坐标
  protected getWorldPosition(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return this.viewport.screenToWorld(screenX, screenY);
  }
}
```

#### 3.3 具体工具实现

**SelectTool** (`src/interactions/SelectTool.ts`)
- 选择和移动表
- 支持拖拽移动
- 发送选择变化事件

**PanTool** (`src/interactions/PanTool.ts`)
- 平移画布
- 拖拽改变视口偏移

**RelationshipTool** (`src/interactions/RelationshipTool.ts`)
- 创建表之间的关系
- 拖拽从源表到目标表
- 在 UILayer 显示预览线

---

### 4. DDL 生成器 (DDL Layer)

#### 4.1 DDLGenerator 接口

**文件**: `src/ddl/DDLGenerator.ts`

```typescript
interface DDLGenerator {
  generate(schema: Schema): string;
  generateTable(table: Table): string;
  generateRelationship(rel: Relationship, schema: Schema): string;
}
```

#### 4.2 MySQL Generator

**文件**: `src/ddl/generators/MySQLGenerator.ts`

```typescript
class MySQLGenerator implements DDLGenerator {
  generate(schema: Schema): string {
    const lines: string[] = [];
    lines.push(`-- Database: ${schema.name}`);
    lines.push(`-- Generated by Tainiex Designer\n`);
    
    // 生成表
    for (const table of schema.tables.values()) {
      lines.push(this.generateTable(table));
      lines.push('');
    }
    
    // 生成外键约束
    for (const rel of schema.relationships.values()) {
      lines.push(this.generateRelationship(rel, schema));
    }
    
    return lines.join('\n');
  }
  
  generateTable(table: Table): string {
    const lines: string[] = [];
    lines.push(`CREATE TABLE \`${table.name}\` (`);
    
    // 字段
    const columnDefs = table.columns.map(col => {
      let def = `  \`${col.name}\` ${col.type}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.autoIncrement) def += ' AUTO_INCREMENT';
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      if (col.comment) def += ` COMMENT '${col.comment}'`;
      return def;
    });
    
    // 主键
    const pks = table.getPrimaryKeys();
    if (pks.length > 0) {
      const pkNames = pks.map(pk => `\`${pk.name}\``).join(', ');
      columnDefs.push(`  PRIMARY KEY (${pkNames})`);
    }
    
    lines.push(columnDefs.join(',\n'));
    lines.push(`)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
    
    return lines.join('\n');
  }
  
  generateRelationship(rel: Relationship, schema: Schema): string {
    const sourceTable = schema.tables.get(rel.sourceTableId);
    const targetTable = schema.tables.get(rel.targetTableId);
    const sourceColumn = sourceTable?.columns.find(c => c.id === rel.sourceColumnId);
    const targetColumn = targetTable?.columns.find(c => c.id === rel.targetColumnId);
    
    if (!sourceTable || !targetTable || !sourceColumn || !targetColumn) {
      return '';
    }
    
    let sql = `ALTER TABLE \`${sourceTable.name}\` ADD CONSTRAINT \`fk_${sourceTable.name}_${targetTable.name}\`\n`;
    sql += `  FOREIGN KEY (\`${sourceColumn.name}\`) REFERENCES \`${targetTable.name}\`(\`${targetColumn.name}\`)`;
    
    if (rel.onDelete) sql += ` ON DELETE ${rel.onDelete}`;
    if (rel.onUpdate) sql += ` ON UPDATE ${rel.onUpdate}`;
    sql += ';';
    
    return sql;
  }
}
```

#### 4.3 Snowflake Generator

**文件**: `src/ddl/generators/SnowflakeGenerator.ts`

关键差异：
- 数据类型映射 (VARCHAR → STRING, INT → NUMBER)
- 不支持 AUTO_INCREMENT (使用 AUTOINCREMENT)
- 支持 CLUSTER BY
- 不同的注释语法

---

### 5. 状态管理 (Store Layer)

#### 5.1 Store

**文件**: `src/store/Store.ts`

```typescript
class Store {
  private static instance: Store;
  
  schema: Schema = new Schema();
  selectedEntities: Set<string> = new Set();
  settings: AppSettings = defaultSettings;
  
  // 事件发射器
  private listeners: Map<string, Function[]> = new Map();
  
  static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store();
    }
    return Store.instance;
  }
  
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event) || [];
    for (const cb of callbacks) {
      cb(...args);
    }
  }
}
```

---

## 开发规范

### 命名约定

- **类名**: PascalCase (例如: `Renderer`, `TableTool`)
- **方法/变量**: camelCase (例如: `scheduleRender`, `isDirty`)
- **常量**: UPPER_SNAKE_CASE (例如: `DEFAULT_GRID_SIZE`)
- **私有成员**: 前缀 `_` 或 `private` (例如: `private ctx`)

### 文件组织

- 每个类一个文件
- 文件名与类名一致
- 相关类放在同一目录

### 注释规范

- 使用 JSDoc 风格注释
- 所有公共 API 必须有文档注释
- 复杂逻辑添加行内注释

### Git 提交规范

- `feat:` 新功能
- `fix:` 修复 bug
- `refactor:` 重构
- `docs:` 文档更新
- `style:` 代码格式调整
- `test:` 测试相关

---

## 性能优化指南

### 1. 渲染优化

- 使用 `requestAnimationFrame` 而非 `setInterval`
- 实现脏区域检测，避免全屏重绘
- 分层渲染，仅更新变化的层
- 使用离屏 Canvas 缓存静态内容

### 2. 交互优化

- 事件委托，避免过多事件监听器
- 节流/防抖处理高频事件 (mousemove, wheel)
- 使用 passive 事件监听器

### 3. 数据优化

- 使用 Map 而非数组存储索引数据
- 避免深层对象复制
- 实现对象池复用临时对象

---

## 错误处理

### 1. 渲染错误

捕获 Canvas 渲染异常，避免整个应用崩溃：

```typescript
try {
  layer.render(ctx, regions);
} catch (error) {
  console.error(`Layer ${layer.constructor.name} render failed:`, error);
  // 标记层为禁用状态
}
```

### 2. 数据验证

在保存/加载时验证数据完整性：

```typescript
if (!schema.tables || !Array.isArray(schema.tables)) {
  throw new Error('Invalid schema format');
}
```

---

## 测试策略

### 1. 单元测试

- 测试数据模型的序列化/反序列化
- 测试 DDL 生成器输出
- 测试视口坐标转换

### 2. 集成测试

- 测试完整的创建表流程
- 测试保存/加载项目
- 测试撤销/重做

### 3. 性能测试

- 100+ 表的渲染性能
- 大量关系线的绘制性能
- 缩放/平移的流畅度

---

## 常见问题 (FAQ)

### Q: 为什么不使用 React/Vue?

A: Canvas 应用的核心是直接操作图形 API，框架的虚拟 DOM 反而会增加开销。我们需要完全控制渲染时机和局部重绘，这在框架中很难实现。

### Q: 如何扩展支持新的数据库?

A: 实现 `DDLGenerator` 接口，创建新的生成器类，注意处理数据类型映射和语法差异。

### Q: 如何优化大型图表的性能?

A: 
1. 实现视口裁剪，只渲染可见区域
2. 使用四叉树等空间数据结构优化碰撞检测
3. 降低远距离表的渲染质量 (LOD)

---

## 版本历史

- **v0.1.0** (2026-01) - 初始版本，基础渲染和建模功能
