import { Layer } from '../Layer';
import { Rect, Point } from '../../utils/types';
import type { Schema } from '../../models/Schema';
import type { Relationship } from '../../models/Relationship';

/**
 * 关系连线层
 */
export class RelationshipLayer extends Layer {
    private schema: Schema | null = null;

    private previewLine: { start: Point; end: Point } | null = null;

    constructor() {
        super();
        this.zIndex = 5; // 在实体层下方
    }

    setSchema(schema: Schema): void {
        this.schema = schema;
        this.markDirty();
    }

    setPreviewLine(line: { start: Point; end: Point } | null): void {
        this.previewLine = line;
        this.markDirty();
    }

    render(ctx: CanvasRenderingContext2D, regions: Rect[]): void {
        if (!this.visible || !this.schema) return;

        // 绘制现有关系
        for (const relationship of this.schema.relationships.values()) {
            this.renderRelationship(ctx, relationship);
        }

        // 绘制预览线
        if (this.previewLine) {
            this.renderPreviewLine(ctx);
        }
    }

    private renderPreviewLine(ctx: CanvasRenderingContext2D): void {
        if (!this.previewLine) return;
        const { start, end } = this.previewLine;

        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        ctx.setLineDash([]);

        // 绘制末端小圈
        ctx.fillStyle = '#2196F3';
        ctx.beginPath();
        ctx.arc(end.x, end.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    private renderRelationship(
        ctx: CanvasRenderingContext2D,
        relationship: Relationship
    ): void {
        if (!this.schema) return;

        const sourceTable = this.schema.tables.get(relationship.sourceTableId);
        const targetTable = this.schema.tables.get(relationship.targetTableId);

        if (!sourceTable || !targetTable) return;

        // 计算连线起点和终点
        const start = this.getTableCenter(sourceTable);
        const end = this.getTableCenter(targetTable);

        // 绘制连线
        ctx.strokeStyle = '#9E9E9E';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // 虚线

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);

        // 使用贝塞尔曲线绘制
        const controlPointOffset = 50;
        const cpX = (start.x + end.x) / 2;
        ctx.quadraticCurveTo(cpX, start.y + controlPointOffset, end.x, end.y);

        ctx.stroke();
        ctx.setLineDash([]); // 重置虚线

        // 绘制箭头
        this.drawArrow(ctx, start, end);

        // 绘制关系类型标签
        this.drawRelationshipLabel(ctx, relationship, start, end);
    }

    private getTableCenter(table: any): Point {
        const width = 200;
        const headerHeight = 40;
        return {
            x: table.position.x + width / 2,
            y: table.position.y + headerHeight / 2,
        };
    }

    private drawArrow(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const arrowSize = 10;

        ctx.fillStyle = '#9E9E9E';
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
            end.x - arrowSize * Math.cos(angle - Math.PI / 6),
            end.y - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            end.x - arrowSize * Math.cos(angle + Math.PI / 6),
            end.y - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    }

    private drawRelationshipLabel(
        ctx: CanvasRenderingContext2D,
        relationship: Relationship,
        start: Point,
        end: Point
    ): void {
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        const label = this.getRelationshipTypeLabel(relationship.type);

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#9E9E9E';
        ctx.lineWidth = 1;

        const padding = 4;
        ctx.font = '12px Arial';
        const metrics = ctx.measureText(label);
        const labelWidth = metrics.width + padding * 2;
        const labelHeight = 18;

        // 标签背景
        ctx.fillRect(
            midX - labelWidth / 2,
            midY - labelHeight / 2,
            labelWidth,
            labelHeight
        );
        ctx.strokeRect(
            midX - labelWidth / 2,
            midY - labelHeight / 2,
            labelWidth,
            labelHeight
        );

        // 标签文本
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, midX, midY);
    }

    private getRelationshipTypeLabel(type: string): string {
        switch (type) {
            case 'one-to-one':
                return '1:1';
            case 'one-to-many':
                return '1:N';
            case 'many-to-many':
                return 'N:M';
            default:
                return type;
        }
    }
}
