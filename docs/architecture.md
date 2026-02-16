# Tainiex Designer - 架构设计文档

## 1. 系统架构概览

Tainiex Designer 采用分层架构设计，将应用分为以下几个主要层次：

```
┌─────────────────────────────────────────┐
│         UI Layer (HTML/CSS)             │
│  (Toolbar, PropertyPanel, Dialogs)     │
├─────────────────────────────────────────┤
│      Interaction Layer (Tools)          │
│  (SelectTool, PanTool, etc.)           │
├─────────────────────────────────────────┤
│      Rendering Layer (Canvas)           │
│  (Renderer, Layers, Viewport)          │
├─────────────────────────────────────────┤
│       Model Layer (Data)                │
│  (Schema, Table, Column, etc.)         │
├─────────────────────────────────────────┤
│      Service Layer (DDL, etc.)          │
│  (DDLGenerator, FileManager)           │
├─────────────────────────────────────────┤
│      Platform Layer (Tauri)             │
│  (File System, Native APIs)            │
└─────────────────────────────────────────┘
```

## 2. 核心模块

### 2.1 渲染引擎 (Renderer)

**职责**：
- 管理 Canvas 渲染循环
- 协调多个图层的渲染
- 处理视口变换
- 优化渲染性能（脏区域管理）

**关键类**：
- `Renderer` - 主渲染器
- `Layer` - 图层基类
- `Viewport` - 视口管理
- `DirtyRegionManager` - 脏区域管理

**渲染流程**：
```
1. scheduleRender() 被调用
2. 标记脏区域
3. RAF 回调触发 render()
4. 检查是否有脏区域
5. 清空 Canvas
6. 按 zIndex 排序图层
7. 依次渲染各图层
8. 清除脏标记
```

### 2.2 分层系统

**图层层次**（从下到上）：

| 图层 | zIndex | 职责 | 更新频率 |
|------|--------|------|----------|
| GridLayer | 0 | 网格背景 | 低（仅视口变化时） |
| RelationshipLayer | 5 | 表关系连线 | 中（数据变化时） |
| EntityLayer | 10 | 表实体 | 中（数据变化时） |
| UILayer | 20 | UI 元素（选择框等） | 高（交互时） |

**图层通信**：
- 通过 `markDirty()` 通知渲染器重绘
- 通过 `setSchema()` 设置数据源
- 通过自定义事件通知其他组件

### 2.3 数据模型

**核心实体**：

```typescript
Schema
  ├── tables: Map<string, Table>
  └── relationships: Map<string, Relationship>

Table
  ├── id: string
  ├── name: string
  ├── position: Point
  ├── columns: Column[]
  ├── indexes: Index[]
  └── constraints: Constraint[]

Column
  ├── id: string
  ├── name: string
  ├── type: string
  ├── primaryKey: boolean
  ├── foreignKey: boolean
  └── ...其他属性

Relationship
  ├── id: string
  ├── type: RelationType
  ├── sourceTableId: string
  ├── targetTableId: string
  └── ...约束信息
```

**数据流**：
```
用户操作 → 修改 Schema → 触发事件 → 图层更新 → 重新渲染
```

### 2.4 交互系统

**工具模式**：
采用策略模式，每个工具实现 `BaseTool` 接口

```typescript
BaseTool
  ├── SelectTool - 选择和移动
  ├── PanTool - 平移画布
  └── RelationshipTool - 创建关系
```

**事件处理流程**：
```
1. 用户操作（鼠标/键盘）
2. InteractionManager 接收事件
3. 分发到当前激活的工具
4. 工具处理逻辑
5. 更新数据模型或视口
6. 触发重绘
```

## 3. 性能优化策略

### 3.1 渲染优化

**脏区域管理**：
- 只重绘变化的区域
- 合并相邻的脏区域
- 全屏重绘时跳过区域计算

**分层渲染**：
- 静态内容（网格）更新频率低
- 动态内容（UI）独立更新
- 避免不必要的全屏重绘

**RAF 循环**：
- 使用 `requestAnimationFrame` 同步浏览器刷新
- 无脏区域时跳过渲染
- 避免阻塞主线程

### 3.2 数据结构优化

**使用 Map 而非数组**：
- O(1) 查找时间
- 适合频繁的增删改查

**ID 生成**：
- 使用时间戳 + 随机数
- 避免 UUID 的性能开销

### 3.3 高 DPI 支持

**自动适配**：
```typescript
const dpr = window.devicePixelRatio || 1;
canvas.width = cssWidth * dpr;
canvas.height = cssHeight * dpr;
ctx.scale(dpr, dpr);
```

## 4. 事件系统

### 4.1 自定义事件

**selection-changed**：
```typescript
window.dispatchEvent(new CustomEvent('selection-changed', {
  detail: { tableIds: ['table-1', 'table-2'] }
}));
```

**tool-changed**：
```typescript
window.dispatchEvent(new CustomEvent('tool-changed', {
  detail: { type: 'select' }
}));
```

### 4.2 事件流

```
用户操作
  ↓
DOM 事件 (mousedown, mousemove, etc.)
  ↓
InteractionManager
  ↓
当前工具处理
  ↓
数据模型更新
  ↓
自定义事件 (selection-changed, etc.)
  ↓
UI 组件响应 (PropertyPanel, etc.)
  ↓
图层标记脏区域
  ↓
渲染器重绘
```

## 5. 扩展点

### 5.1 添加新图层

1. 继承 `Layer` 基类
2. 实现 `render()` 方法
3. 设置合适的 `zIndex`
4. 在 `Renderer` 中注册

### 5.2 添加新工具

1. 继承 `BaseTool` 基类
2. 实现事件处理方法
3. 在 `InteractionManager` 中注册
4. 添加 UI 按钮

### 5.3 添加新数据库方言

1. 实现 `DDLGenerator` 接口
2. 处理数据类型映射
3. 实现特定语法
4. 注册到生成器列表

## 6. 技术决策

### 6.1 为什么不使用 React/Vue？

**原因**：
- Canvas 应用需要完全控制渲染时机
- 虚拟 DOM 会增加不必要的开销
- 局部重绘在框架中难以实现
- 性能是首要考虑因素

### 6.2 为什么使用 Tauri 而非 Electron？

**优势**：
- 更小的包体积（~3MB vs ~100MB）
- 更低的内存占用
- Rust 的性能和安全性
- 原生系统集成更好

### 6.3 为什么使用 TypeScript？

**优势**：
- 类型安全，减少运行时错误
- 更好的 IDE 支持
- 代码可维护性高
- 重构更安全

## 7. 未来规划

### 7.1 短期目标

- [ ] 完善关系创建功能
- [ ] 实现撤销/重做
- [ ] 添加项目保存/加载
- [ ] 支持更多数据库方言

### 7.2 中期目标

- [ ] 数据库逆向工程
- [ ] SQL 导入
- [ ] 协作功能
- [ ] 插件系统

### 7.3 长期目标

- [ ] 云端同步
- [ ] 团队协作
- [ ] AI 辅助设计
- [ ] 数据库迁移工具
