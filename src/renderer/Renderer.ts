import { Layer } from './Layer';
import { Viewport } from './Viewport';
import { DirtyRegionManager } from './DirtyRegionManager';
import { Rect } from '../utils/types';

/**
 * 主渲染器 - 管理Canvas渲染循环
 */
export class Renderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private layers: Layer[] = [];
    private viewport: Viewport;
    private dirtyRegionManager: DirtyRegionManager;
    private animationFrameId: number | null = null;
    private isRunning: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2D context');
        }
        this.ctx = context;
        this.viewport = new Viewport();
        this.dirtyRegionManager = new DirtyRegionManager();

        // 设置 Canvas 高 DPI 支持
        this.setupHighDPI();
    }

    /**
     * 设置高DPI显示支持
     */
    private setupHighDPI(): void {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
            console.warn('Canvas has zero dimensions. Waiting for layout...');
            return;
        }

        // 物理像素大小
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        // CSS 像素大小保持一致
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        console.log(`Canvas resized to: ${rect.width}x${rect.height} (DPR: ${dpr})`);
    }

    /**
     * 启动渲染循环
     */
    start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.scheduleRender(); // 触发首次渲染

        const loop = () => {
            if (!this.isRunning) return;

            this.render();
            this.animationFrameId = requestAnimationFrame(loop);
        };

        loop();
    }

    /**
     * 停止渲染循环
     */
    stop(): void {
        this.isRunning = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * 主渲染方法
     */
    private render(): void {
        if (!this.dirtyRegionManager.isDirty()) {
            return; // 无需渲染
        }

        const regions = this.dirtyRegionManager.getRegions();
        const isFullRedraw = regions.some(r => r.width === Infinity);

        // 正确清空画布
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        // 开始渲染
        this.ctx.save();

        const dpr = window.devicePixelRatio || 1;
        this.ctx.scale(dpr, dpr);

        // 应用基本视口变换
        this.viewport.applyTransform(this.ctx);

        // 按 zIndex 排序
        const sortedLayers = [...this.layers].sort((a, b) => a.zIndex - b.zIndex);

        for (const layer of sortedLayers) {
            if (layer.visible && (layer.isDirty() || isFullRedraw)) {
                try {
                    this.ctx.save();
                    layer.render(this.ctx, regions);
                    layer.clearDirty();
                    this.ctx.restore();
                } catch (error) {
                    console.error(`Layer ${layer.constructor.name} render failed:`, error);
                }
            }
        }

        this.ctx.restore();
        this.dirtyRegionManager.clear();
    }

    /**
     * 调度渲染
     */
    scheduleRender(region?: Rect): void {
        this.dirtyRegionManager.addRegion(region);
    }

    /**
     * 添加图层
     */
    addLayer(layer: Layer): void {
        this.layers.push(layer);
        layer.setRenderer(this);
        this.scheduleRender();
    }

    /**
     * 移除图层
     */
    removeLayer(layer: Layer): void {
        const index = this.layers.indexOf(layer);
        if (index > -1) {
            this.layers.splice(index, 1);
            this.scheduleRender();
        }
    }

    /**
     * 获取视口
     */
    getViewport(): Viewport {
        return this.viewport;
    }

    /**
     * 获取 Canvas 元素
     */
    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    /**
     * 调整大小
     */
    resize(): void {
        this.setupHighDPI();
        this.scheduleRender();
    }
}
