import { Layer } from '../Layer';
import { Rect } from '../../utils/types';

/**
 * UI层 - 绘制选择框、高亮等交互元素
 */
export class UILayer extends Layer {
    private selectedTableIds: Set<string> = new Set();
    private hoveredTableId: string | null = null;
    private selectionBox: Rect | null = null;

    constructor() {
        super();
        this.zIndex = 20; // 最上层
    }

    render(ctx: CanvasRenderingContext2D, regions: Rect[]): void {
        if (!this.visible) return;

        // 绘制选择框
        if (this.selectionBox) {
            this.renderSelectionBox(ctx, this.selectionBox);
        }

        // TODO: 绘制选中表的高亮
        // TODO: 绘制拖拽预览
    }

    private renderSelectionBox(ctx: CanvasRenderingContext2D, box: Rect): void {
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
        ctx.fillRect(box.x, box.y, box.width, box.height);
    }

    setSelectionBox(box: Rect | null): void {
        this.selectionBox = box;
        this.markDirty();
    }

    setSelectedTableIds(ids: Set<string>): void {
        this.selectedTableIds = ids;
        this.markDirty();
    }

    setHoveredTableId(id: string | null): void {
        this.hoveredTableId = id;
        this.markDirty();
    }
}
