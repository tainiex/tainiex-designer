import { Layer } from '../Layer';
import { Rect } from '../../utils/types';

/**
 * 网格背景层
 */
export class GridLayer extends Layer {
    private gridSize: number = 20; // 网格大小
    private gridColor: string = '#e0e0e0';
    private backgroundColor: string = '#ffffff';

    constructor() {
        super();
        this.zIndex = 0; // 最底层
    }

    render(ctx: CanvasRenderingContext2D, regions: Rect[]): void {
        if (!this.visible || !this.renderer) return;

        const viewport = this.renderer.getViewport();
        const canvas = ctx.canvas;

        // 获取当前可视区域的世界坐标范围
        // 注意：这里使用 clientWidth/Height 获取 CSS 像素大小
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        const topLeft = viewport.screenToWorld(0, 0);
        const bottomRight = viewport.screenToWorld(width, height);

        // 绘制背景色，覆盖整个可视世界区域
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);

        // 绘制网格
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 1 / viewport.getScale(); // 保持线宽为 1 像素物理宽度

        const gridSize = this.gridSize;

        // 计算网格线的起始坐标（对齐到 gridSize）
        const startX = Math.floor(topLeft.x / gridSize) * gridSize;
        const startY = Math.floor(topLeft.y / gridSize) * gridSize;

        ctx.beginPath();
        // 垂直线
        for (let x = startX; x <= bottomRight.x; x += gridSize) {
            ctx.moveTo(x, topLeft.y);
            ctx.lineTo(x, bottomRight.y);
        }

        // 水平线
        for (let y = startY; y <= bottomRight.y; y += gridSize) {
            ctx.moveTo(topLeft.x, y);
            ctx.lineTo(bottomRight.x, y);
        }
        ctx.stroke();
    }

    setGridSize(size: number): void {
        this.gridSize = size;
        this.markDirty();
    }

    setGridColor(color: string): void {
        this.gridColor = color;
        this.markDirty();
    }

    setBackgroundColor(color: string): void {
        this.backgroundColor = color;
        this.markDirty();
    }
}
