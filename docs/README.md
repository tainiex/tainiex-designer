# Tainiex Designer - 设计文档

本目录包含 Tainiex Designer 的详细设计文档。

## 📚 文档索引

### 核心文档

1. **[架构设计](./architecture.md)** - 系统整体架构、模块划分、技术决策
   - 系统架构概览
   - 核心模块说明
   - 性能优化策略
   - 事件系统
   - 扩展点
   - 未来规划

2. **[渲染系统](./rendering-system.md)** - Canvas 渲染引擎详细设计
   - 渲染流程
   - 图层系统
   - 视口系统
   - 脏区域管理
   - 高 DPI 支持
   - 性能监控

3. **[交互系统](./interaction-system.md)** - 用户交互和工具系统
   - 交互架构
   - InteractionManager
   - 工具实现（SelectTool, PanTool, RelationshipTool）
   - 事件系统
   - 碰撞检测
   - 性能优化

4. **[数据模型](./data-model.md)** - 数据结构和模型设计
   - 模型概览
   - Schema, Table, Column, Relationship
   - 序列化和反序列化
   - ID 生成策略
   - 数据验证
   - 数据迁移

## 🎯 快速导航

### 按角色导航

**前端开发者**：
1. 先阅读 [架构设计](./architecture.md) 了解整体结构
2. 再阅读 [渲染系统](./rendering-system.md) 了解 Canvas 渲染
3. 最后阅读 [交互系统](./interaction-system.md) 了解用户交互

**后端开发者**：
1. 先阅读 [数据模型](./data-model.md) 了解数据结构
2. 再阅读 [架构设计](./architecture.md) 了解系统集成

**LLM Agent**：
1. 阅读根目录的 [AGENTS.md](../AGENTS.md) 获取开发指南
2. 参考本目录的详细设计文档进行开发

### 按任务导航

**添加新功能**：
- 查看 [架构设计](./architecture.md) 的"扩展点"章节
- 根据功能类型查看对应的详细文档

**性能优化**：
- [渲染系统](./rendering-system.md) - 渲染性能优化
- [交互系统](./interaction-system.md) - 交互性能优化
- [数据模型](./data-model.md) - 数据结构优化

**调试问题**：
- 每个文档都有"调试技巧"章节
- [渲染系统](./rendering-system.md) - 可视化调试
- [交互系统](./interaction-system.md) - 事件调试

## 📖 文档约定

### 代码示例

文档中的代码示例使用 TypeScript，遵循项目的编码规范。

```typescript
// ✅ 推荐的写法
class MyClass {
  private field: string;
  
  constructor(field: string) {
    this.field = field;
  }
}

// ❌ 不推荐的写法
class MyClass {
  field; // 缺少类型
  
  constructor(field) { // 缺少类型
    this.field = field;
  }
}
```

### 图表说明

- 使用 ASCII 图表表示架构和流程
- 使用 Mermaid 语法表示复杂的关系（如果需要）
- 使用表格对比不同方案

### 术语表

| 术语 | 说明 |
|------|------|
| RAF | requestAnimationFrame，浏览器动画 API |
| DPR | Device Pixel Ratio，设备像素比 |
| Canvas | HTML5 Canvas 2D API |
| Viewport | 视口，控制画布的平移和缩放 |
| Layer | 图层，渲染系统的基本单位 |
| Tool | 工具，交互系统的基本单位 |
| Schema | 数据库模式，包含所有表和关系 |
| DDL | Data Definition Language，数据定义语言 |

## 🔄 文档更新

### 更新原则

1. **保持同步**：代码变更时同步更新文档
2. **向后兼容**：标注废弃的 API 和迁移路径
3. **版本标记**：重大变更标注版本号

### 更新流程

1. 修改代码
2. 更新对应的文档
3. 更新 AGENTS.md（如果影响 API）
4. 提交时在 commit message 中说明文档变更

### 文档版本

- **v0.1.0** (2026-02-16) - 初始版本
  - 架构设计文档
  - 渲染系统文档
  - 交互系统文档
  - 数据模型文档

## 🤝 贡献指南

### 添加新文档

1. 在 `docs/` 目录创建新的 Markdown 文件
2. 在本 README 中添加索引
3. 遵循现有文档的格式和风格

### 改进现有文档

1. 修正错误或不清晰的描述
2. 添加更多示例
3. 补充缺失的章节
4. 提交 Pull Request

### 文档风格

- 使用清晰的标题层次
- 提供代码示例
- 使用图表辅助说明
- 添加实用的调试技巧
- 标注性能注意事项

## 📞 联系方式

如有文档相关问题，请：
1. 提交 Issue
2. 发起 Discussion
3. 提交 Pull Request

## 📄 许可证

本文档采用与项目相同的 MIT 许可证。
