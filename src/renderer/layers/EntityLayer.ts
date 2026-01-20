import { Layer } from '../Layer';
import { Rect, rectContainsPoint } from '../../utils/types';
import type { Table } from '../../models/Table';
import type { Schema } from '../../models/Schema';

/**
 * 实体（表）绘制层
 */
export class EntityLayer extends Layer {
    private schema: Schema | null = null;

    constructor() {
        super();
        this.zIndex = 10; // 中间层
    }

    setSchema(schema: Schema): void {
        this.schema = schema;
        this.markDirty();
    }

    render(ctx: CanvasRenderingContext2D, regions: Rect[]): void {
        if (!this.visible || !this.schema) return;

        for (const table of this.schema.tables.values()) {
            this.renderTable(ctx, table);
        }
    }

    private renderTable(ctx: CanvasRenderingContext2D, table: Table): void {
        const { x, y } = table.position;
        const width = 200;
        const headerHeight = 40;
        const rowHeight = 30;
        const totalHeight = headerHeight + table.columns.length * rowHeight;

        // 绘制表框
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;

        // 表边框
        ctx.fillRect(x, y, width, totalHeight);
        ctx.strokeRect(x, y, width, totalHeight);

        // 表头
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(x, y, width, headerHeight);

        // 表名
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(table.name, x + width / 2, y + headerHeight / 2);

        // 字段列表
        let currentY = y + headerHeight;
        ctx.fillStyle = '#333333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';

        for (const column of table.columns) {
            // 字段背景
            if (column.primaryKey) {
                ctx.fillStyle = '#FFF9C4'; // 主键高亮
                ctx.fillRect(x, currentY, width, rowHeight);
            }

            // 字段名
            ctx.fillStyle = column.primaryKey ? '#F57C00' : '#333333';
            const prefix = column.primaryKey ? '🔑 ' : '';
            ctx.fillText(
                `${prefix}${column.name}`,
                x + 10,
                currentY + rowHeight / 2
            );

            // 字段类型
            ctx.fillStyle = '#757575';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(column.type, x + width - 10, currentY + rowHeight / 2);

            // 分隔线
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, currentY + rowHeight);
            ctx.lineTo(x + width, currentY + rowHeight);
            ctx.stroke();

            currentY += rowHeight;
            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
        }
    }

    /**
     * 根据坐标查找表
     */
    findTableAt(worldX: number, worldY: number): Table | null {
        if (!this.schema) return null;

        for (const table of this.schema.tables.values()) {
            const width = 200;
            const headerHeight = 40;
            const rowHeight = 30;
            const totalHeight = headerHeight + table.columns.length * rowHeight;

            const rect: Rect = {
                x: table.position.x,
                y: table.position.y,
                width,
                height: totalHeight,
            };

            if (rectContainsPoint(rect, { x: worldX, y: worldY })) {
                return table;
            }
        }

        return null;
    }
}
