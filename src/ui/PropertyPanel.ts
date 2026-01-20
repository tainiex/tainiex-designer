import { Table } from '../models/Table';
import { Schema } from '../models/Schema';
import { Column } from '../models/Column';

/**
 * 属性面板类 - 负责更新 UI 面板
 */
export class PropertyPanel {
  private container: HTMLElement;
  private schema: Schema;
  private currentTable: Table | null = null;
  private onUpdate: () => void;

  constructor(containerId: string, schema: Schema, onUpdate: () => void) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container with id ${containerId} not found`);
    this.container = el;
    this.schema = schema;
    this.onUpdate = onUpdate;
  }

  public showTable(table: Table | null): void {
    this.currentTable = table;
    this.render();
  }

  private render(): void {
    if (!this.currentTable) {
      this.container.innerHTML = '<p class="empty-state">Select a table to edit properties</p>';
      return;
    }

    const table = this.currentTable;

    // 创建基本的 HTML 结构
    const html = `
      <div class="panel-section">
        <h3>Table Information</h3>
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="prop-table-name" value="${table.name}">
        </div>
        <div class="form-group">
          <label>Comment</label>
          <input type="text" id="prop-table-comment" value="${table.comment || ''}">
        </div>
      </div>
      
      <div class="panel-section">
        <h3>Columns</h3>
        <div id="prop-columns-list">
          ${table.columns.map(col => `
            <div class="column-item" style="margin-bottom: 8px; font-size: 13px; display: flex; justify-content: space-between;">
              <span><strong>${col.name}</strong></span>
              <span style="color: #666;">${col.type}</span>
            </div>
          `).join('')}
        </div>
        <button class="btn-primary" style="width: 100%; margin-top: 8px;" id="btn-add-column">Add Column</button>
      </div>
    `;

    this.container.innerHTML = html;
    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.currentTable) return;

    const nameInput = document.getElementById('prop-table-name') as HTMLInputElement;
    nameInput?.addEventListener('input', (e) => {
      if (this.currentTable) {
        this.currentTable.name = (e.target as HTMLInputElement).value;
        this.onUpdate();
      }
    });

    const commentInput = document.getElementById('prop-table-comment') as HTMLInputElement;
    commentInput?.addEventListener('input', (e) => {
      if (this.currentTable) {
        this.currentTable.comment = (e.target as HTMLInputElement).value;
        this.onUpdate();
      }
    });

    const addColBtn = document.getElementById('btn-add-column');
    addColBtn?.addEventListener('click', (e) => {
      e.stopPropagation(); // 防止事件冲突

      const colName = prompt('Column Name:', 'new_col');
      if (colName && this.currentTable) {
        const type = prompt('Data Type:', 'VARCHAR(255)') || 'VARCHAR(255)';
        const newCol = Column.create(colName, type);
        this.currentTable.addColumn(newCol);
        this.render(); // 重新渲染面板
        this.onUpdate(); // 标记层脏并重绘 Canvas
      }
    });
  }
}
