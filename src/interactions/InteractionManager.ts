import { BaseTool } from './BaseTool';
import { SelectTool } from './SelectTool';
import { PanTool } from './PanTool';
import { RelationshipTool } from './RelationshipTool';
import { EntityLayer } from '../renderer/layers/EntityLayer';
import { RelationshipLayer } from '../renderer/layers/RelationshipLayer';
import { UILayer } from '../renderer/layers/UILayer';
import { Renderer } from '../renderer/Renderer';
import { Schema } from '../models/Schema';

export type ToolType = 'select' | 'pan' | 'table' | 'relationship';

/**
 * 交互管理器
 */
export class InteractionManager {
    private renderer: Renderer;
    private canvas: HTMLCanvasElement;
    private currentTool: BaseTool;
    private tools: Map<ToolType, BaseTool> = new Map();

    private activeToolType: ToolType = 'select';

    constructor(
        renderer: Renderer,
        entityLayer: EntityLayer,
        relationshipLayer: RelationshipLayer,
        uiLayer: UILayer,
        schema: Schema
    ) {
        this.renderer = renderer;
        this.canvas = renderer.getCanvas();
        const viewport = renderer.getViewport();

        // 初始化工具
        this.tools.set('select', new SelectTool(viewport, entityLayer, uiLayer));
        this.tools.set('pan', new PanTool(viewport));
        this.tools.set('relationship', new RelationshipTool(viewport, entityLayer, relationshipLayer, schema));

        this.currentTool = this.tools.get('select')!;
        this.activeToolType = 'select';

        this.bindEvents();
    }

    public setTool(type: ToolType): void {
        const tool = this.tools.get(type);
        if (tool && tool !== this.currentTool) {
            this.currentTool.deactivate();
            this.currentTool = tool;
            this.activeToolType = type;
            this.currentTool.activate();

            // 触发事件通知 UI 更新状态
            const event = new CustomEvent('tool-changed', { detail: { type } });
            window.dispatchEvent(event);

            console.log(`Tool switched to: ${type}`);
        }
    }

    public getActiveToolType(): ToolType {
        return this.activeToolType;
    }

    private bindEvents(): void {
        this.canvas.addEventListener('mousedown', (e) => {
            this.currentTool.onMouseDown(e);
            this.renderer.scheduleRender();
        });

        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const relativeEvent = new MouseEvent('mousemove', {
                clientX: e.clientX,
                clientY: e.clientY,
                button: e.button,
                buttons: e.buttons
            });

            Object.defineProperty(relativeEvent, 'offsetX', { value: e.clientX - rect.left });
            Object.defineProperty(relativeEvent, 'offsetY', { value: e.clientY - rect.top });

            this.currentTool.onMouseMove(relativeEvent);
            this.renderer.scheduleRender();
        });

        window.addEventListener('mouseup', (e) => {
            this.currentTool.onMouseUp(e);
            this.renderer.scheduleRender();
        });

        window.addEventListener('keydown', (e) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return;

            this.currentTool.onKeyDown(e);

            // 快捷键处理
            if (e.key === 'v' || e.key === 'V') this.setTool('select');
            if (e.key === 'h' || e.key === 'H') this.setTool('pan');
            if (e.key === 'r' || e.key === 'R') this.setTool('relationship');

            this.renderer.scheduleRender();
        });

        window.addEventListener('keyup', (e) => {
            this.currentTool.onKeyUp(e);
            this.renderer.scheduleRender();
        });
    }
}

