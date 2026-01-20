import { Point, Rect } from '../utils/types';

/**
 * 视口管理器 - 处理画布的平移和缩放
 */
export class Viewport {
    private offsetX: number = 0;
    private offsetY: number = 0;
    private scale: number = 1.0;

    private readonly MIN_SCALE = 0.1;
    private readonly MAX_SCALE = 5.0;

    /**
     * 应用变换到 Canvas 上下文
     */
    applyTransform(ctx: CanvasRenderingContext2D): void {
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);
    }

    /**
     * 屏幕坐标转换为世界坐标
     */
    screenToWorld(screenX: number, screenY: number): Point {
        return {
            x: (screenX - this.offsetX) / this.scale,
            y: (screenY - this.offsetY) / this.scale,
        };
    }

    /**
     * 世界坐标转换为屏幕坐标
     */
    worldToScreen(worldX: number, worldY: number): Point {
        return {
            x: worldX * this.scale + this.offsetX,
            y: worldY * this.scale + this.offsetY,
        };
    }

    /**
     * 平移视口
     */
    pan(dx: number, dy: number): void {
        this.offsetX += dx;
        this.offsetY += dy;
    }

    /**
     * 缩放视口（以指定点为中心）
     */
    zoom(deltaScale: number, centerX: number, centerY: number): void {
        const oldScale = this.scale;
        this.scale = Math.max(
            this.MIN_SCALE,
            Math.min(this.MAX_SCALE, this.scale * (1 + deltaScale))
        );

        // 以指定点为中心缩放
        const scaleRatio = this.scale / oldScale;
        this.offsetX = centerX - (centerX - this.offsetX) * scaleRatio;
        this.offsetY = centerY - (centerY - this.offsetY) * scaleRatio;
    }

    /**
     * 重置视口
     */
    reset(): void {
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1.0;
    }

    /**
     * 获取当前缩放级别
     */
    getScale(): number {
        return this.scale;
    }

    /**
     * 获取当前偏移量
     */
    getOffset(): Point {
        return { x: this.offsetX, y: this.offsetY };
    }
}
