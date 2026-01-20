import { Rect } from '../utils/types';
import type { Renderer } from './Renderer';

/**
 * 抽象图层基类
 */
export abstract class Layer {
    protected renderer: Renderer | null = null;
    protected dirty: boolean = true;
    public zIndex: number = 0;
    public visible: boolean = true;

    /**
     * 设置渲染器引用
     */
    setRenderer(renderer: Renderer): void {
        this.renderer = renderer;
    }

    /**
     * 渲染图层内容
     * @param ctx - Canvas 2D 上下文
     * @param dirtyRegions - 需要重绘的区域列表
     */
    abstract render(ctx: CanvasRenderingContext2D, dirtyRegions: Rect[]): void;

    /**
     * 标记图层为脏（需要重绘）
     */
    markDirty(region?: Rect): void {
        this.dirty = true;
        if (this.renderer) {
            this.renderer.scheduleRender(region);
        }
    }

    /**
     * 检查图层是否脏
     */
    isDirty(): boolean {
        return this.dirty;
    }

    /**
     * 清除脏标记
     */
    clearDirty(): void {
        this.dirty = false;
    }

    /**
     * 显示图层
     */
    show(): void {
        if (!this.visible) {
            this.visible = true;
            this.markDirty();
        }
    }

    /**
     * 隐藏图层
     */
    hide(): void {
        if (this.visible) {
            this.visible = false;
            this.markDirty();
        }
    }
}
