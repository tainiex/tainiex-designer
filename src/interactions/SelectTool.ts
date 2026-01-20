import { BaseTool } from './BaseTool';
import { Viewport } from '../renderer/Viewport';
import { EntityLayer } from '../renderer/layers/EntityLayer';
import { UILayer } from '../renderer/layers/UILayer';
import { Point, Rect } from '../utils/types';
import { Table } from '../models/Table';

/**
 * 选择工具 - 处理选择和拖拽
 */
export class SelectTool extends BaseTool {
    private entityLayer: EntityLayer;
    private uiLayer: UILayer;

    private isDragging: boolean = false;
    private dragTarget: Table | null = null;
    private lastDragPos: Point = { x: 0, y: 0 };

    private isSelecting: boolean = false;
    private selectionStart: Point = { x: 0, y: 0 };

    constructor(viewport: Viewport, entityLayer: EntityLayer, uiLayer: UILayer) {
        super(viewport);
        this.entityLayer = entityLayer;
        this.uiLayer = uiLayer;
    }

    onMouseDown(e: MouseEvent): void {
        const worldPos = this.viewport.screenToWorld(e.offsetX, e.offsetY);

        // 检查是否点中了表
        const table = this.entityLayer.findTableAt(worldPos.x, worldPos.y);

        if (table) {
            this.isDragging = true;
            this.dragTarget = table;
            this.lastDragPos = worldPos;

            // 更新选择状态
            const selectedIds = new Set<string>([table.id]);
            this.uiLayer.setSelectedTableIds(selectedIds);

            // 派发事件
            window.dispatchEvent(new CustomEvent('selection-changed', {
                detail: { tableIds: Array.from(selectedIds) }
            }));
        } else {
            // 开始框选
            this.isSelecting = true;
            this.selectionStart = worldPos;
            this.uiLayer.setSelectedTableIds(new Set());

            window.dispatchEvent(new CustomEvent('selection-changed', {
                detail: { tableIds: [] }
            }));
        }
    }

    onMouseMove(e: MouseEvent): void {
        const worldPos = this.viewport.screenToWorld(e.offsetX, e.offsetY);

        if (this.isDragging && this.dragTarget) {
            const dx = worldPos.x - this.lastDragPos.x;
            const dy = worldPos.y - this.lastDragPos.y;

            this.dragTarget.position.x += dx;
            this.dragTarget.position.y += dy;

            this.lastDragPos = worldPos;
            this.entityLayer.markDirty();
        } else if (this.isSelecting) {
            const width = worldPos.x - this.selectionStart.x;
            const height = worldPos.y - this.selectionStart.y;

            const box: Rect = {
                x: Math.min(this.selectionStart.x, worldPos.x),
                y: Math.min(this.selectionStart.y, worldPos.y),
                width: Math.abs(width),
                height: Math.abs(height)
            };

            this.uiLayer.setSelectionBox(box);
        }
    }

    onMouseUp(e: MouseEvent): void {
        this.isDragging = false;
        this.dragTarget = null;

        if (this.isSelecting) {
            this.isSelecting = false;
            this.uiLayer.setSelectionBox(null);
            // TODO: 处理框选逻辑（多选）
        }
    }
}
