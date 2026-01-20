import { Rect, rectsIntersect } from '../utils/types';

/**
 * 脏区域管理器 - 优化渲染性能
 */
export class DirtyRegionManager {
    private regions: Rect[] = [];
    private fullRedraw: boolean = false;

    /**
     * 添加脏区域
     */
    addRegion(region?: Rect): void {
        if (!region) {
            // 标记全屏重绘
            this.fullRedraw = true;
            this.regions = [];
        } else if (!this.fullRedraw) {
            this.regions.push(region);
        }
    }

    /**
     * 获取合并后的脏区域
     */
    getRegions(): Rect[] {
        if (this.fullRedraw) {
            return [{ x: 0, y: 0, width: Infinity, height: Infinity }];
        }

        if (this.regions.length === 0) {
            return [];
        }

        // 合并重叠的区域
        return this.mergeRegions(this.regions);
    }

    /**
     * 清除所有脏区域
     */
    clear(): void {
        this.regions = [];
        this.fullRedraw = false;
    }

    /**
     * 是否需要重绘
     */
    isDirty(): boolean {
        return this.fullRedraw || this.regions.length > 0;
    }

    /**
     * 合并重叠的矩形区域
     */
    private mergeRegions(regions: Rect[]): Rect[] {
        if (regions.length === 0) return [];
        if (regions.length === 1) return regions;

        // 简单实现：计算包围盒
        // TODO: 可以优化为更精细的区域合并算法
        const minX = Math.min(...regions.map((r) => r.x));
        const minY = Math.min(...regions.map((r) => r.y));
        const maxX = Math.max(...regions.map((r) => r.x + r.width));
        const maxY = Math.max(...regions.map((r) => r.y + r.height));

        return [
            {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
            },
        ];
    }

    /**
     * 检查区域是否在脏区域内
     */
    isRegionDirty(region: Rect): boolean {
        if (this.fullRedraw) return true;

        for (const dirty of this.regions) {
            if (rectsIntersect(region, dirty)) {
                return true;
            }
        }

        return false;
    }
}
