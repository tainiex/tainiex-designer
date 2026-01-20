import { BaseTool } from './BaseTool';
import { Viewport } from '../renderer/Viewport';
import { EntityLayer } from '../renderer/layers/EntityLayer';
import { RelationshipLayer } from '../renderer/layers/RelationshipLayer';
import { Table } from '../models/Table';
import { Relationship } from '../models/Relationship';
import { Schema } from '../models/Schema';

/**
 * 关系工具 - 通过拖拽连接两个表
 */
export class RelationshipTool extends BaseTool {
    private entityLayer: EntityLayer;
    private relationshipLayer: RelationshipLayer;
    private schema: Schema;

    private isLinking: boolean = false;
    private sourceTable: Table | null = null;

    constructor(viewport: Viewport, entityLayer: EntityLayer, relationshipLayer: RelationshipLayer, schema: Schema) {
        super(viewport);
        this.entityLayer = entityLayer;
        this.relationshipLayer = relationshipLayer;
        this.schema = schema;
    }

    onMouseDown(e: MouseEvent): void {
        const worldPos = this.viewport.screenToWorld(e.offsetX, e.offsetY);
        const table = this.entityLayer.findTableAt(worldPos.x, worldPos.y);

        if (table) {
            this.isLinking = true;
            this.sourceTable = table;

            // 更新预览
            this.relationshipLayer.setPreviewLine({
                start: { x: table.position.x + 100, y: table.position.y + 20 },
                end: worldPos
            });
        }
    }

    onMouseMove(e: MouseEvent): void {
        if (!this.isLinking || !this.sourceTable) return;

        const worldPos = this.viewport.screenToWorld(e.offsetX, e.offsetY);

        // 更新预览线
        this.relationshipLayer.setPreviewLine({
            start: { x: this.sourceTable.position.x + 100, y: this.sourceTable.position.y + 40 },
            end: worldPos
        });

        this.relationshipLayer.markDirty();
    }

    onMouseUp(e: MouseEvent): void {
        if (!this.isLinking || !this.sourceTable) return;

        const worldPos = this.viewport.screenToWorld(e.offsetX, e.offsetY);
        const targetTable = this.entityLayer.findTableAt(worldPos.x, worldPos.y);

        if (targetTable && targetTable !== this.sourceTable) {
            // 创建关系
            const rel = Relationship.create(
                'one-to-many',
                this.sourceTable.id,
                targetTable.id,
                this.sourceTable.columns[0]?.id || '',
                targetTable.columns[0]?.id || ''
            );

            this.schema.addRelationship(rel);
            this.relationshipLayer.markDirty();
        }

        this.isLinking = false;
        this.sourceTable = null;
        this.relationshipLayer.setPreviewLine(null);
        this.relationshipLayer.markDirty();
    }
}
