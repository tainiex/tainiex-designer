# 关系系统重构 - 任务列表

## 任务概览

- [x] 1. Relationship 模型扩展
  - [x] 1.1 添加 name 和 comment 字段
  - [x] 1.2 实现 validate() 方法
  - [x] 1.3 更新 toJSON() 和 fromJSON()
  - [x] 1.4 单元测试

- [-] 2. 验证引擎实现
  - [x] 2.1 创建 ValidationEngine 类
  - [x] 2.2 实现验证规则
  - [x] 2.3 实现验证结果收集
  - [x] 2.4 单元测试

- [ ] 3. RelationshipWizard 组件
  - [ ] 3.1 创建向导对话框结构
  - [ ] 3.2 实现步骤 1：显示表信息
  - [ ] 3.3 实现步骤 2：选择字段
  - [ ] 3.4 实现步骤 3：选择关系类型
  - [ ] 3.5 实现步骤 4：配置级联规则
  - [ ] 3.6 实现导航逻辑
  - [ ] 3.7 集成验证
  - [ ] 3.8 样式和交互

- [ ] 4. RelationshipEditor 组件
  - [ ] 4.1 创建编辑对话框结构
  - [ ] 4.2 实现表单字段
  - [ ] 4.3 实现实时验证
  - [ ] 4.4 实现保存/取消/删除
  - [ ] 4.5 样式和交互

- [ ] 5. RelationshipLayer 增强
  - [ ] 5.1 实现不同类型的连线样式
  - [ ] 5.2 实现箭头绘制
  - [ ] 5.3 实现标签显示
  - [ ] 5.4 实现交互状态（悬停、选中）
  - [ ] 5.5 性能优化

- [ ] 6. RelationshipTool 增强
  - [ ] 6.1 集成 RelationshipWizard
  - [ ] 6.2 实现双击打开编辑器
  - [ ] 6.3 实现关系选择
  - [ ] 6.4 优化拖拽体验

- [ ] 7. ValidationPanel 组件
  - [ ] 7.1 创建验证面板结构
  - [ ] 7.2 显示错误和警告列表
  - [ ] 7.3 实现点击定位
  - [ ] 7.4 显示修复建议
  - [ ] 7.5 样式和交互

- [ ] 8. 集成和测试
  - [ ] 8.1 集成所有组件
  - [ ] 8.2 端到端测试
  - [ ] 8.3 性能测试
  - [ ] 8.4 跨平台测试
  - [ ] 8.5 文档更新

## 详细任务说明

### 1. Relationship 模型扩展

**目标**：扩展 Relationship 类以支持新功能

**文件**：`src/models/Relationship.ts`

**任务**：
1.1 添加 `name?: string` 和 `comment?: string` 字段
1.2 实现 `validate(schema: Schema): ValidationResult` 方法
1.3 更新 `toJSON()` 包含新字段
1.4 更新 `fromJSON()` 解析新字段
1.5 编写单元测试

**验收标准**：
- 新字段可以正确序列化和反序列化
- validate() 方法返回正确的验证结果
- 所有测试通过

### 2. 验证引擎实现

**目标**：创建独立的验证引擎

**文件**：`src/services/ValidationEngine.ts`

**任务**：
2.1 创建 ValidationEngine 类
2.2 实现验证规则：
    - 表存在性检查
    - 字段存在性检查
    - 类型兼容性检查
    - 主键建议
    - 索引建议
    - 循环依赖检查
2.3 实现结果收集和格式化
2.4 编写单元测试

**验收标准**：
- 所有验证规则正确执行
- 返回结构化的验证结果
- 所有测试通过

### 3. RelationshipWizard 组件

**目标**：创建关系创建向导

**文件**：`src/ui/RelationshipWizard.ts`

**任务**：
3.1 创建向导对话框 HTML 结构
3.2 实现步骤 1：显示源表和目标表
3.3 实现步骤 2：字段选择下拉列表
3.4 实现步骤 3：关系类型单选按钮
3.5 实现步骤 4：级联规则下拉列表
3.6 实现"上一步"、"下一步"、"完成"、"取消"按钮
3.7 集成验证引擎
3.8 添加 CSS 样式

**验收标准**：
- 向导可以正确显示和导航
- 每一步的验证正确
- 完成后创建关系
- UI 美观易用

### 4. RelationshipEditor 组件

**目标**：创建关系编辑对话框

**文件**：`src/ui/RelationshipEditor.ts`

**任务**：
4.1 创建编辑对话框 HTML 结构
4.2 实现所有表单字段
4.3 实现实时验证和错误显示
4.4 实现保存、取消、删除按钮
4.5 添加 CSS 样式

**验收标准**：
- 对话框正确显示当前关系属性
- 修改后可以保存
- 验证错误正确显示
- UI 美观易用

### 5. RelationshipLayer 增强

**目标**：增强关系的可视化

**文件**：`src/renderer/layers/RelationshipLayer.ts`

**任务**：
5.1 实现不同关系类型的连线样式
5.2 实现箭头绘制函数
5.3 实现标签绘制
5.4 实现悬停和选中状态
5.5 优化渲染性能

**验收标准**：
- 不同类型关系有不同视觉样式
- 箭头正确显示
- 标签清晰可读
- 交互流畅
- 性能达标

### 6. RelationshipTool 增强

**目标**：增强关系工具功能

**文件**：`src/interactions/RelationshipTool.ts`

**任务**：
6.1 在 onMouseUp 时打开 RelationshipWizard
6.2 实现双击关系打开 RelationshipEditor
6.3 实现关系选择逻辑
6.4 优化拖拽预览

**验收标准**：
- 拖拽创建关系打开向导
- 双击关系打开编辑器
- 选择关系正确高亮
- 交互流畅

### 7. ValidationPanel 组件

**目标**：创建验证结果面板

**文件**：`src/ui/ValidationPanel.ts`

**任务**：
7.1 创建面板 HTML 结构
7.2 显示错误和警告列表
7.3 实现点击定位到相关对象
7.4 显示修复建议
7.5 添加 CSS 样式

**验收标准**：
- 验证结果清晰显示
- 点击可以定位到对象
- 修复建议有用
- UI 美观易用

### 8. 集成和测试

**目标**：集成所有组件并测试

**任务**：
8.1 在 main.ts 中集成所有组件
8.2 编写端到端测试
8.3 进行性能测试
8.4 在 Windows/macOS/Linux 上测试
8.5 更新文档

**验收标准**：
- 所有功能正常工作
- 所有测试通过
- 性能达标
- 文档完整

## 时间估算

| 任务 | 估算 |
|------|------|
| 1. Relationship 模型扩展 | 0.5 天 |
| 2. 验证引擎实现 | 1 天 |
| 3. RelationshipWizard 组件 | 1.5 天 |
| 4. RelationshipEditor 组件 | 1 天 |
| 5. RelationshipLayer 增强 | 1 天 |
| 6. RelationshipTool 增强 | 0.5 天 |
| 7. ValidationPanel 组件 | 0.5 天 |
| 8. 集成和测试 | 1 天 |
| **总计** | **7 天** |

## 依赖关系

```
1. Relationship 模型扩展
   ↓
2. 验证引擎实现
   ↓
3. RelationshipWizard 组件 ──┐
   ↓                         │
4. RelationshipEditor 组件 ──┤
   ↓                         │
5. RelationshipLayer 增强 ────┤
   ↓                         │
6. RelationshipTool 增强 ─────┤
   ↓                         │
7. ValidationPanel 组件 ──────┘
   ↓
8. 集成和测试
```

## 下一步

开始任务 1：Relationship 模型扩展
