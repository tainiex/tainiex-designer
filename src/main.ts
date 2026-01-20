import './styles.css';
import { Renderer } from './renderer/Renderer';
import { GridLayer } from './renderer/layers/GridLayer';
import { EntityLayer } from './renderer/layers/EntityLayer';
import { RelationshipLayer } from './renderer/layers/RelationshipLayer';
import { UILayer } from './renderer/layers/UILayer';
import { Schema } from './models/Schema';
import { Table } from './models/Table';
import { Column } from './models/Column';
import { InteractionManager, ToolType } from './interactions/InteractionManager';
import { SnowflakeGenerator } from './ddl/generators/SnowflakeGenerator';
import { PropertyPanel } from './ui/PropertyPanel';

/**
 * 应用主类
 */
class App {
  private renderer: Renderer;
  private schema: Schema;
  private interactionManager: InteractionManager;
  private snowflakeGenerator: SnowflakeGenerator;
  private propertyPanel: PropertyPanel;

  private gridLayer: GridLayer;
  private entityLayer: EntityLayer;
  private relationshipLayer: RelationshipLayer;
  private uiLayer: UILayer;

  constructor() {
    // 初始化 Canvas
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    // 创建渲染器
    this.renderer = new Renderer(canvas);

    // 创建 Schema
    this.schema = new Schema();
    this.schema.name = 'My Database';

    // 初始化图层
    this.gridLayer = new GridLayer();
    this.entityLayer = new EntityLayer();
    this.relationshipLayer = new RelationshipLayer();
    this.uiLayer = new UILayer();

    // 添加图层到渲染器
    this.renderer.addLayer(this.gridLayer);
    this.renderer.addLayer(this.relationshipLayer);
    this.renderer.addLayer(this.entityLayer);
    this.renderer.addLayer(this.uiLayer);

    // 设置 Schema
    this.entityLayer.setSchema(this.schema);
    this.relationshipLayer.setSchema(this.schema);

    // 初始化生成器
    this.snowflakeGenerator = new SnowflakeGenerator();

    // 初始化属性面板
    this.propertyPanel = new PropertyPanel('properties-content', this.schema, () => {
      this.entityLayer.markDirty();
      this.renderer.scheduleRender();
    });

    // 初始化交互管理器
    this.interactionManager = new InteractionManager(
      this.renderer,
      this.entityLayer,
      this.relationshipLayer,
      this.uiLayer,
      this.schema
    );

    // 监听选择变化
    window.addEventListener('selection-changed', (e: any) => {
      const tableIds = e.detail.tableIds;
      if (tableIds.length > 0) {
        const table = this.schema.getTable(tableIds[0]);
        this.propertyPanel.showTable(table || null);
      } else {
        this.propertyPanel.showTable(null);
      }
    });

    // 创建示例数据
    this.createSampleData();

    // 绑定 UI 事件
    this.bindUIEvents();

    // 启动渲染循环
    this.renderer.start();

    // 强制执行初次 resize 以确保正确尺寸
    setTimeout(() => {
      this.renderer.resize();
    }, 100);

    console.log('Tainiex Designer initialized!');
  }

  private createSampleData(): void {
    // 创建用户表
    const userTable = Table.create('users', 100, 100);
    userTable.addColumn(Column.create('id', 'INT'));
    userTable.columns[0].primaryKey = true;
    userTable.columns[0].autoIncrement = true;
    userTable.addColumn(Column.create('username', 'VARCHAR(50)'));
    userTable.addColumn(Column.create('email', 'VARCHAR(100)'));
    userTable.addColumn(Column.create('created_at', 'TIMESTAMP'));

    // 创建文章表
    const postTable = Table.create('posts', 400, 100);
    postTable.addColumn(Column.create('id', 'INT'));
    postTable.columns[0].primaryKey = true;
    postTable.columns[0].autoIncrement = true;
    postTable.addColumn(Column.create('user_id', 'INT'));
    postTable.columns[1].foreignKey = true;
    postTable.addColumn(Column.create('title', 'VARCHAR(200)'));
    postTable.addColumn(Column.create('content', 'TEXT'));
    postTable.addColumn(Column.create('created_at', 'TIMESTAMP'));

    // 添加到 Schema
    this.schema.addTable(userTable);
    this.schema.addTable(postTable);

    // 通知图层更新
    this.entityLayer.markDirty();
  }

  private bindUIEvents(): void {
    const canvas = this.renderer.getCanvas();
    const viewport = this.renderer.getViewport();

    // 窗口大小变化
    window.addEventListener('resize', () => {
      this.renderer.resize();
    });

    // 鼠标滚轮缩放/平移 (保留作为全局功能或移动到特定的 InteractionManager 处理)
    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.001;
        viewport.zoom(delta, mouseX, mouseY);
      } else {
        viewport.pan(-e.deltaX, -e.deltaY);
      }
      this.renderer.scheduleRender();
    });

    // 工具栏按钮点击
    const toolButtons: Record<string, ToolType> = {
      'btn-select': 'select',
      'btn-pan': 'pan',
      'btn-create-table': 'table',
      'btn-relationship': 'relationship'
    };

    Object.entries(toolButtons).forEach(([id, type]) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          this.switchTool(id, type);
        });
      }
    });

    // 监听工具切换事件（处理快捷键触发的更新）
    window.addEventListener('tool-changed', (e: any) => {
      const type = e.detail.type;
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));

      const btnId = Object.keys(toolButtons).find(key => toolButtons[key] === type);
      if (btnId) {
        document.getElementById(btnId)?.classList.add('active');
      }
    });

    // 导出 DDL 按钮
    const exportBtn = document.getElementById('btn-export-ddl');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const ddl = this.snowflakeGenerator.generate(this.schema);
        console.log('--- GENERATED DDL (SNOWFLAKE) ---');
        console.log(ddl);
        console.log('---------------------------------');
        alert('Snowflake DDL has been generated and logged to console!\n\nCheck dev tools (F12) to see results.');
      });
    }
  }

  private switchTool(btnId: string, tool: ToolType): void {
    // 特殊处理创建表工具
    if (tool === 'table') {
      const name = prompt('Table Name:', 'new_table');
      if (name) {
        // 在视口中心或默认位置创建
        const table = Table.create(name, 100, 100);
        table.addColumn(Column.create('id', 'INT'));
        this.schema.addTable(table);
        this.entityLayer.markDirty();
      }
      return;
    }

    this.interactionManager.setTool(tool);

    // 更新 UI 状态
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(btnId)?.classList.add('active');
  }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
