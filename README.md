# Tainiex Designer

一个基于 Tauri + Canvas 2D 的跨平台数据库建模工具，支持可视化设计和 DDL 生成。

## ✨ 核心特性

- 🎨 **可视化建模** - 基于 Canvas 2D 的高性能图形渲染
- 🚀 **分层渲染** - 优化的多层渲染架构，支持局部重绘
- 🔄 **跨平台** - 基于 Tauri 2.x，支持 Windows, macOS, Linux
- 📦 **DDL 生成** - 支持 Snowflake 数据库方言（可扩展）
- 💾 **实时编辑** - 属性面板实时编辑表和字段
- ⚡ **高性能** - requestAnimationFrame 动画循环，流畅交互
- 🎯 **交互工具** - 选择、平移、创建表、创建关系等多种工具

## 🏗️ 技术架构

### 前端技术栈
- **Vite 6.x** - 快速的构建工具和开发服务器
- **TypeScript 5.6** - 类型安全的开发体验，严格模式
- **Canvas 2D API** - 原生图形渲染，无框架依赖
- **Vanilla JS** - 零框架依赖，极致性能

### 后端技术栈
- **Tauri 2.10** - Rust 驱动的轻量级桌面应用框架
- **Rust** - 高性能、内存安全的系统编程语言

### 渲染引擎特性
- **分层渲染系统**
  - GridLayer (zIndex: 0) - 网格背景
  - RelationshipLayer (zIndex: 5) - 表关系连线
  - EntityLayer (zIndex: 10) - 表/实体
  - UILayer (zIndex: 20) - 选择框、高亮等 UI 元素
- **脏区域管理** - 仅渲染变化区域，优化性能
- **视口变换** - 平移 (Pan) 和缩放 (Zoom) 支持
- **高 DPI 支持** - 自动适配 Retina 等高分辨率显示器

## 🎯 当前支持的功能

### 已实现
- ✅ Canvas 渲染引擎（分层架构）
- ✅ 视口平移和缩放
- ✅ 表的创建和编辑
- ✅ 字段管理（增删改）
- ✅ 属性面板实时编辑
- ✅ 交互工具系统（选择、平移、关系）
- ✅ Snowflake DDL 生成器
- ✅ 高 DPI 显示支持

### 开发中
- 🚧 关系创建和编辑
- 🚧 撤销/重做功能
- 🚧 项目保存/加载
- 🚧 更多数据库方言支持（MySQL, PostgreSQL）

## 📁 项目结构

```
tainiex-designer/
├── src/                      # 前端源代码
│   ├── renderer/             # Canvas 渲染引擎
│   │   ├── Renderer.ts       # 主渲染器（RAF 循环、图层管理）
│   │   ├── Layer.ts          # 分层系统基类
│   │   ├── Viewport.ts       # 视口变换管理（平移/缩放）
│   │   ├── DirtyRegionManager.ts  # 局部重绘管理
│   │   └── layers/           # 各层实现
│   │       ├── GridLayer.ts       # 网格背景层
│   │       ├── EntityLayer.ts     # 表实体渲染层
│   │       ├── RelationshipLayer.ts  # 关系连线层
│   │       └── UILayer.ts         # UI 元素层
│   ├── models/               # 数据模型
│   │   ├── Schema.ts         # 数据库模式
│   │   ├── Table.ts          # 表模型
│   │   ├── Column.ts         # 字段模型
│   │   └── Relationship.ts   # 关系模型
│   ├── interactions/         # 交互系统
│   │   ├── InteractionManager.ts  # 交互管理器
│   │   ├── BaseTool.ts       # 工具基类
│   │   ├── SelectTool.ts     # 选择工具
│   │   ├── PanTool.ts        # 平移工具
│   │   └── RelationshipTool.ts  # 关系创建工具
│   ├── ddl/                  # DDL 生成器
│   │   ├── DDLGenerator.ts   # 生成器接口
│   │   └── generators/
│   │       └── SnowflakeGenerator.ts  # Snowflake 方言
│   ├── ui/                   # UI 组件
│   │   └── PropertyPanel.ts  # 属性编辑面板
│   ├── utils/                # 工具函数
│   │   └── types.ts          # 类型定义和工具函数
│   ├── main.ts               # 应用入口
│   └── styles.css            # 全局样式
├── src-tauri/                # Tauri 后端
│   ├── src/
│   │   ├── main.rs           # Rust 主程序
│   │   └── lib.rs            # 库入口
│   ├── Cargo.toml            # Rust 依赖配置
│   └── tauri.conf.json       # Tauri 配置
├── index.html                # HTML 入口
├── package.json              # NPM 依赖配置
├── tsconfig.json             # TypeScript 配置
├── vite.config.ts            # Vite 构建配置
├── README.md                 # 项目说明
└── AGENTS.md                 # LLM Agent 开发文档
```

## 🚀 开发指南

### 环境要求

- **Node.js** 18+ 
- **Rust** 1.70+ (用于 Tauri)
- **系统依赖**：参考 [Tauri Prerequisites](https://tauri.app/start/prerequisites/)
  - Windows: WebView2, Visual Studio Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: webkit2gtk, 其他依赖见 Tauri 文档

### 安装依赖

```bash
# 安装 NPM 依赖
npm install

# Rust 依赖会在首次构建时自动下载
```

### 开发模式

```bash
npm run tauri dev
```

首次运行会编译 Rust 依赖，需要几分钟时间。后续启动会快很多。

### 构建应用

```bash
# 构建生产版本
npm run tauri build

# 构建产物位于 src-tauri/target/release/
```

### 开发工具

- **Chrome DevTools** - 在开发模式下按 F12 打开
- **Rust 日志** - 查看终端输出
- **热重载** - 前端代码修改后自动刷新

## 🎮 使用说明

### 快捷键

- `Space + 拖拽` - 平移画布（或使用平移工具）
- `Ctrl/Cmd + 滚轮` - 缩放画布
- `滚轮` - 平移画布
- `Ctrl/Cmd + Z` - 撤销（开发中）
- `Ctrl/Cmd + Y` - 重做（开发中）
- `Delete` - 删除选中元素（开发中）

### 基本操作

1. **创建表** 
   - 点击工具栏的"新建表"按钮
   - 输入表名
   - 在属性面板中添加字段

2. **编辑表** 
   - 使用选择工具点击表
   - 在右侧属性面板编辑表名和字段
   - 修改会实时反映在画布上

3. **移动表**
   - 使用选择工具拖拽表到新位置

4. **创建关系** 
   - 选择关系工具（开发中）
   - 从源表拖拽到目标表

5. **生成 DDL** 
   - 点击"导出 DDL"按钮
   - DDL 会输出到浏览器控制台

### 工具栏

- **选择工具** - 选择和移动表
- **平移工具** - 拖拽画布
- **新建表** - 创建新表
- **关系工具** - 创建表关系（开发中）
- **导出 DDL** - 生成 Snowflake DDL

## 📝 开发规范

详见 [AGENTS.md](./AGENTS.md) - LLM Agent 开发文档

详细设计文档见 [docs/](./docs/) 目录

## 🔧 技术细节

### 版本信息
- Tauri: 2.10.2
- @tauri-apps/api: 2.10.1
- Vite: 6.0.3
- TypeScript: 5.6.2

### 性能优化
- 使用 requestAnimationFrame 实现流畅的 60fps 渲染
- 脏区域管理避免不必要的重绘
- 高 DPI 显示器自动适配
- 分层渲染减少绘制开销

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 提交规范
遵循 [Conventional Commits](https://www.conventionalcommits.org/)：
- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具链更新
