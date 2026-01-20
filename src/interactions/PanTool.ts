import { BaseTool } from './BaseTool';
import { Viewport } from '../renderer/Viewport';
import { Point } from '../utils/types';

/**
 * 平移工具
 */
export class PanTool extends BaseTool {
    private isPanning: boolean = false;
    private lastScreenPos: Point = { x: 0, y: 0 };

    constructor(viewport: Viewport) {
        super(viewport);
    }

    onMouseDown(e: MouseEvent): void {
        this.isPanning = true;
        this.lastScreenPos = { x: e.clientX, y: e.clientY };
    }

    onMouseMove(e: MouseEvent): void {
        if (!this.isPanning) return;

        const dx = e.clientX - this.lastScreenPos.x;
        const dy = e.clientY - this.lastScreenPos.y;

        this.viewport.pan(dx, dy);
        this.lastScreenPos = { x: e.clientX, y: e.clientY };
    }

    onMouseUp(e: MouseEvent): void {
        this.isPanning = false;
    }
}
