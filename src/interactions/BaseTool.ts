import { Viewport } from '../renderer/Viewport';

/**
 * 交互工具基类
 */
export abstract class BaseTool {
    protected viewport: Viewport;

    constructor(viewport: Viewport) {
        this.viewport = viewport;
    }

    abstract onMouseDown(e: MouseEvent): void;
    abstract onMouseMove(e: MouseEvent): void;
    abstract onMouseUp(e: MouseEvent): void;

    onKeyDown(e: KeyboardEvent): void { }
    onKeyUp(e: KeyboardEvent): void { }

    // 工具激活/停用时的回调
    activate(): void { }
    deactivate(): void { }
}
