import { Schema } from '../models/Schema';
import { Table } from '../models/Table';
import { Column } from '../models/Column';
import { Relationship, RelationType, ReferentialAction } from '../models/Relationship';
import { ValidationEngine } from '../services/ValidationEngine';

/**
 * 关系创建向导 - 多步骤对话框
 */
export class RelationshipWizard {
    private overlay: HTMLElement | null = null;
    private dialog: HTMLElement | null = null;
    private schema: Schema;
    private sourceTable: Table;
    private targetTable: Table;
    private currentStep: number = 1;
    private totalSteps: number = 4;

    // 向导数据
    private selectedSourceColumn: Column | null = null;
    private selectedTargetColumn: Column | null = null;
    private selectedType: RelationType = 'one-to-many';
    private relationshipName: string = '';
    private relationshipComment: string = '';
    private onDelete: ReferentialAction = 'RESTRICT';
    private onUpdate: ReferentialAction = 'RESTRICT';

    private onComplete: ((relationship: Relationship) => void) | null = null;
    private onCancel: (() => void) | null = null;

    constructor(schema: Schema, sourceTable: Table, targetTable: Table) {
        this.schema = schema;
        this.sourceTable = sourceTable;
        this.targetTable = targetTable;
        
        // 生成默认名称
        this.relationshipName = `fk_${sourceTable.name}_${targetTable.name}`;
    }

    /**
     * 显示向导
     */
    public show(onComplete: (relationship: Relationship) => void, onCancel: () => void): void {
        this.onComplete = onComplete;
        this.onCancel = onCancel;
        this.currentStep = 1;
        this.createDialog();
        this.renderStep();
    }

    /**
     * 创建对话框结构
     */
    private createDialog(): void {
        // 创建遮罩层
        this.overlay = document.createElement('div');
        this.overlay.className = 'wizard-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        // 创建对话框
        this.dialog = document.createElement('div');
        this.dialog.className = 'wizard-dialog';
        this.dialog.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            width: 600px;
            max-width: 90vw;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
        `;

        this.overlay.appendChild(this.dialog);
        document.body.appendChild(this.overlay);

        // 点击遮罩层关闭
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });
    }

    /**
     * 渲染当前步骤
     */
    private renderStep(): void {
        if (!this.dialog) return;

        const header = this.renderHeader();
        const content = this.renderContent();
        const footer = this.renderFooter();

        this.dialog.innerHTML = '';
        this.dialog.appendChild(header);
        this.dialog.appendChild(content);
        this.dialog.appendChild(footer);

        this.bindStepEvents();
    }

    /**
     * 渲染头部
     */
    private renderHeader(): HTMLElement {
        const header = document.createElement('div');
        header.className = 'wizard-header';
        header.style.cssText = `
            padding: 20px 24px;
            border-bottom: 1px solid #e0e0e0;
        `;

        const stepLabels = ['Tables', 'Columns', 'Type', 'Options'];
        
        header.innerHTML = `
            <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Create Relationship</h2>
            <div class="wizard-steps" style="display: flex; align-items: center; justify-content: space-between; position: relative;">
                ${Array.from({ length: this.totalSteps }, (_, i) => {
                    const stepNum = i + 1;
                    const isActive = stepNum === this.currentStep;
                    const isCompleted = stepNum < this.currentStep;
                    const isLast = stepNum === this.totalSteps;
                    
                    return `
                        <div style="display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; z-index: 1;">
                            <div style="
                                width: 40px;
                                height: 40px;
                                border-radius: 50%;
                                background: ${isCompleted ? '#4CAF50' : isActive ? '#2196F3' : '#e0e0e0'};
                                color: white;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-weight: 600;
                                font-size: 16px;
                                transition: all 0.3s;
                                box-shadow: ${isActive ? '0 2px 8px rgba(33, 150, 243, 0.4)' : 'none'};
                                position: relative;
                            ">
                                ${isCompleted ? '✓' : stepNum}
                            </div>
                            <div style="
                                margin-top: 8px;
                                font-size: 12px;
                                font-weight: ${isActive ? '600' : '400'};
                                color: ${isActive ? '#2196F3' : isCompleted ? '#4CAF50' : '#999'};
                                text-align: center;
                            ">
                                ${stepLabels[i]}
                            </div>
                            ${!isLast ? `
                                <div style="
                                    position: absolute;
                                    top: 20px;
                                    left: 50%;
                                    width: calc(100% + 20px);
                                    height: 2px;
                                    background: ${isCompleted ? '#4CAF50' : '#e0e0e0'};
                                    z-index: -1;
                                    transition: background 0.3s;
                                "></div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        return header;
    }

    /**
     * 渲染内容区域
     */
    private renderContent(): HTMLElement {
        const content = document.createElement('div');
        content.className = 'wizard-content';
        content.style.cssText = `
            padding: 24px;
            overflow-y: auto;
            flex: 1;
        `;

        switch (this.currentStep) {
            case 1:
                content.innerHTML = this.renderStep1();
                break;
            case 2:
                content.innerHTML = this.renderStep2();
                break;
            case 3:
                content.innerHTML = this.renderStep3();
                break;
            case 4:
                content.innerHTML = this.renderStep4();
                break;
        }

        return content;
    }

    /**
     * 步骤1：显示表信息
     */
    private renderStep1(): string {
        return `
            <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Table Information</h3>
            <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
                Review the tables that will be connected by this relationship.
            </p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="table-info-card" style="
                    padding: 16px;
                    border: 2px solid #2196F3;
                    border-radius: 8px;
                    background: #E3F2FD;
                ">
                    <div style="font-size: 12px; color: #1976D2; font-weight: 600; margin-bottom: 8px;">SOURCE TABLE</div>
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">${this.sourceTable.name}</div>
                    <div style="font-size: 13px; color: #666;">
                        ${this.sourceTable.columns.length} column${this.sourceTable.columns.length !== 1 ? 's' : ''}
                    </div>
                </div>
                
                <div class="table-info-card" style="
                    padding: 16px;
                    border: 2px solid #4CAF50;
                    border-radius: 8px;
                    background: #E8F5E9;
                ">
                    <div style="font-size: 12px; color: #388E3C; font-weight: 600; margin-bottom: 8px;">TARGET TABLE</div>
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">${this.targetTable.name}</div>
                    <div style="font-size: 13px; color: #666;">
                        ${this.targetTable.columns.length} column${this.targetTable.columns.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 24px; padding: 12px; background: #FFF3E0; border-left: 4px solid #FF9800; border-radius: 4px;">
                <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">💡 Tip</div>
                <div style="font-size: 13px; color: #666;">
                    The source table will contain the foreign key column that references the target table.
                </div>
            </div>
        `;
    }

    /**
     * 步骤2：选择字段
     */
    private renderStep2(): string {
        const sourceColumns = this.sourceTable.columns;
        const targetColumns = this.targetTable.columns;
        const targetPKs = this.targetTable.getPrimaryKeys();

        return `
            <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Select Columns</h3>
            <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
                Choose which columns to connect between the two tables.
            </p>
            
            <div class="form-group" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                    Source Column (Foreign Key)
                </label>
                <select id="wizard-source-column" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    background: white;
                ">
                    <option value="">-- Select a column --</option>
                    ${sourceColumns.map(col => `
                        <option value="${col.id}" ${this.selectedSourceColumn?.id === col.id ? 'selected' : ''}>
                            ${col.name} (${col.type})
                        </option>
                    `).join('')}
                </select>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">
                    This column in ${this.sourceTable.name} will reference the target table
                </div>
            </div>
            
            <div class="form-group">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                    Target Column (Referenced)
                </label>
                <select id="wizard-target-column" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    background: white;
                ">
                    <option value="">-- Select a column --</option>
                    ${targetColumns.map(col => `
                        <option value="${col.id}" ${this.selectedTargetColumn?.id === col.id ? 'selected' : ''}>
                            ${col.name} (${col.type})${col.primaryKey ? ' 🔑' : ''}
                        </option>
                    `).join('')}
                </select>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">
                    This column in ${this.targetTable.name} will be referenced
                </div>
            </div>
            
            ${targetPKs.length > 0 ? `
                <div style="margin-top: 16px; padding: 12px; background: #E8F5E9; border-left: 4px solid #4CAF50; border-radius: 4px;">
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">✓ Recommended</div>
                    <div style="font-size: 13px; color: #666;">
                        Target column should be a primary key: ${targetPKs.map(pk => pk.name).join(', ')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    /**
     * 步骤3：选择关系类型
     */
    private renderStep3(): string {
        const types: { value: RelationType; label: string; description: string; icon: string }[] = [
            {
                value: 'one-to-one',
                label: 'One-to-One',
                description: 'Each record in the source table relates to exactly one record in the target table',
                icon: '1:1'
            },
            {
                value: 'one-to-many',
                label: 'One-to-Many',
                description: 'Each record in the target table can relate to multiple records in the source table',
                icon: '1:N'
            },
            {
                value: 'many-to-many',
                label: 'Many-to-Many',
                description: 'Records in both tables can relate to multiple records in the other table',
                icon: 'N:M'
            }
        ];

        return `
            <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Relationship Type</h3>
            <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
                Select the type of relationship between the tables.
            </p>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${types.map(type => `
                    <label class="relationship-type-option" style="
                        display: flex;
                        align-items: flex-start;
                        padding: 16px;
                        border: 2px solid ${this.selectedType === type.value ? '#2196F3' : '#e0e0e0'};
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                        background: ${this.selectedType === type.value ? '#E3F2FD' : 'white'};
                    ">
                        <input 
                            type="radio" 
                            name="relationship-type" 
                            value="${type.value}"
                            ${this.selectedType === type.value ? 'checked' : ''}
                            style="margin-right: 12px; margin-top: 2px;"
                        >
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <span style="
                                    display: inline-block;
                                    padding: 2px 8px;
                                    background: #2196F3;
                                    color: white;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    font-weight: 600;
                                ">${type.icon}</span>
                                <span style="font-weight: 600; font-size: 15px;">${type.label}</span>
                            </div>
                            <div style="font-size: 13px; color: #666; line-height: 1.5;">
                                ${type.description}
                            </div>
                        </div>
                    </label>
                `).join('')}
            </div>
        `;
    }

    /**
     * 步骤4：配置级联规则
     */
    private renderStep4(): string {
        const actions: ReferentialAction[] = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'];

        return `
            <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Referential Actions</h3>
            <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
                Configure what happens when records are updated or deleted.
            </p>
            
            <div class="form-group" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                    Relationship Name (Optional)
                </label>
                <input 
                    type="text" 
                    id="wizard-rel-name" 
                    value="${this.relationshipName}"
                    placeholder="e.g., fk_posts_users"
                    style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 14px;
                        box-sizing: border-box;
                    "
                >
            </div>
            
            <div class="form-group" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                    Comment (Optional)
                </label>
                <input 
                    type="text" 
                    id="wizard-rel-comment" 
                    value="${this.relationshipComment}"
                    placeholder="Describe this relationship"
                    style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 14px;
                        box-sizing: border-box;
                    "
                >
            </div>
            
            <div class="form-group" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                    On Delete
                </label>
                <select id="wizard-on-delete" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    background: white;
                ">
                    ${actions.map(action => `
                        <option value="${action}" ${this.onDelete === action ? 'selected' : ''}>
                            ${action}
                        </option>
                    `).join('')}
                </select>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">
                    Action to take when a referenced record is deleted
                </div>
            </div>
            
            <div class="form-group">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                    On Update
                </label>
                <select id="wizard-on-update" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    background: white;
                ">
                    ${actions.map(action => `
                        <option value="${action}" ${this.onUpdate === action ? 'selected' : ''}>
                            ${action}
                        </option>
                    `).join('')}
                </select>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">
                    Action to take when a referenced record is updated
                </div>
            </div>
            
            <div id="wizard-validation-result" style="margin-top: 20px;"></div>
        `;
    }

    /**
     * 渲染底部按钮
     */
    private renderFooter(): HTMLElement {
        const footer = document.createElement('div');
        footer.className = 'wizard-footer';
        footer.style.cssText = `
            padding: 16px 24px;
            border-top: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            gap: 12px;
        `;

        const isFirstStep = this.currentStep === 1;
        const isLastStep = this.currentStep === this.totalSteps;

        footer.innerHTML = `
            <button id="wizard-cancel" style="
                padding: 10px 20px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            ">Cancel</button>
            
            <div style="display: flex; gap: 12px;">
                <button id="wizard-prev" ${isFirstStep ? 'disabled' : ''} style="
                    padding: 10px 20px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 4px;
                    cursor: ${isFirstStep ? 'not-allowed' : 'pointer'};
                    font-size: 14px;
                    font-weight: 500;
                    opacity: ${isFirstStep ? '0.5' : '1'};
                ">Previous</button>
                
                <button id="wizard-next" style="
                    padding: 10px 20px;
                    border: none;
                    background: #2196F3;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                ">${isLastStep ? 'Create Relationship' : 'Next'}</button>
            </div>
        `;

        return footer;
    }

    /**
     * 绑定当前步骤的事件
     */
    private bindStepEvents(): void {
        // 取消按钮
        const cancelBtn = document.getElementById('wizard-cancel');
        cancelBtn?.addEventListener('click', () => this.close());

        // 上一步按钮
        const prevBtn = document.getElementById('wizard-prev');
        prevBtn?.addEventListener('click', () => this.previousStep());

        // 下一步/完成按钮
        const nextBtn = document.getElementById('wizard-next');
        nextBtn?.addEventListener('click', () => {
            if (this.currentStep === this.totalSteps) {
                this.finish();
            } else {
                this.nextStep();
            }
        });

        // 步骤特定的事件
        switch (this.currentStep) {
            case 2:
                this.bindStep2Events();
                break;
            case 3:
                this.bindStep3Events();
                break;
            case 4:
                this.bindStep4Events();
                break;
        }
    }

    /**
     * 步骤2的事件绑定
     */
    private bindStep2Events(): void {
        const sourceSelect = document.getElementById('wizard-source-column') as HTMLSelectElement;
        sourceSelect?.addEventListener('change', (e) => {
            const columnId = (e.target as HTMLSelectElement).value;
            this.selectedSourceColumn = this.sourceTable.getColumn(columnId) || null;
        });

        const targetSelect = document.getElementById('wizard-target-column') as HTMLSelectElement;
        targetSelect?.addEventListener('change', (e) => {
            const columnId = (e.target as HTMLSelectElement).value;
            this.selectedTargetColumn = this.targetTable.getColumn(columnId) || null;
        });
    }

    /**
     * 步骤3的事件绑定
     */
    private bindStep3Events(): void {
        const radioButtons = document.querySelectorAll('input[name="relationship-type"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.selectedType = (e.target as HTMLInputElement).value as RelationType;
                this.renderStep(); // 重新渲染以更新选中状态
            });
        });
    }

    /**
     * 步骤4的事件绑定
     */
    private bindStep4Events(): void {
        const nameInput = document.getElementById('wizard-rel-name') as HTMLInputElement;
        nameInput?.addEventListener('input', (e) => {
            this.relationshipName = (e.target as HTMLInputElement).value;
        });

        const commentInput = document.getElementById('wizard-rel-comment') as HTMLInputElement;
        commentInput?.addEventListener('input', (e) => {
            this.relationshipComment = (e.target as HTMLInputElement).value;
        });

        const onDeleteSelect = document.getElementById('wizard-on-delete') as HTMLSelectElement;
        onDeleteSelect?.addEventListener('change', (e) => {
            this.onDelete = (e.target as HTMLSelectElement).value as ReferentialAction;
        });

        const onUpdateSelect = document.getElementById('wizard-on-update') as HTMLSelectElement;
        onUpdateSelect?.addEventListener('change', (e) => {
            this.onUpdate = (e.target as HTMLSelectElement).value as ReferentialAction;
        });

        // 实时验证
        this.validateRelationship();
    }

    /**
     * 验证关系
     */
    private validateRelationship(): void {
        if (!this.selectedSourceColumn || !this.selectedTargetColumn) return;

        const tempRel = Relationship.create(
            this.selectedType,
            this.sourceTable.id,
            this.targetTable.id,
            this.selectedSourceColumn.id,
            this.selectedTargetColumn.id
        );
        tempRel.name = this.relationshipName;
        tempRel.comment = this.relationshipComment;
        tempRel.onDelete = this.onDelete;
        tempRel.onUpdate = this.onUpdate;

        const result = tempRel.validate(this.schema);
        const resultDiv = document.getElementById('wizard-validation-result');
        
        if (!resultDiv) return;

        if (result.errors.length > 0) {
            resultDiv.innerHTML = `
                <div style="padding: 12px; background: #FFEBEE; border-left: 4px solid #F44336; border-radius: 4px;">
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #C62828;">
                        ❌ Validation Errors
                    </div>
                    ${result.errors.map(err => `
                        <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
                            • ${err.message}
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (result.warnings.length > 0) {
            resultDiv.innerHTML = `
                <div style="padding: 12px; background: #FFF3E0; border-left: 4px solid #FF9800; border-radius: 4px;">
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #E65100;">
                        ⚠️ Warnings
                    </div>
                    ${result.warnings.map(warn => `
                        <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
                            • ${warn.message}
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="padding: 12px; background: #E8F5E9; border-left: 4px solid #4CAF50; border-radius: 4px;">
                    <div style="font-size: 13px; font-weight: 600; color: #2E7D32;">
                        ✓ Validation passed
                    </div>
                </div>
            `;
        }
    }

    /**
     * 下一步
     */
    private nextStep(): void {
        // 验证当前步骤
        if (!this.validateCurrentStep()) {
            return;
        }

        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.renderStep();
        }
    }

    /**
     * 上一步
     */
    private previousStep(): void {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.renderStep();
        }
    }

    /**
     * 验证当前步骤
     */
    private validateCurrentStep(): boolean {
        switch (this.currentStep) {
            case 2:
                if (!this.selectedSourceColumn || !this.selectedTargetColumn) {
                    alert('Please select both source and target columns');
                    return false;
                }
                break;
        }
        return true;
    }

    /**
     * 完成向导
     */
    private finish(): void {
        if (!this.selectedSourceColumn || !this.selectedTargetColumn) {
            alert('Please complete all required fields');
            return;
        }

        // 创建关系
        const relationship = Relationship.create(
            this.selectedType,
            this.sourceTable.id,
            this.targetTable.id,
            this.selectedSourceColumn.id,
            this.selectedTargetColumn.id
        );

        if (this.relationshipName) {
            relationship.name = this.relationshipName;
        }
        if (this.relationshipComment) {
            relationship.comment = this.relationshipComment;
        }
        relationship.onDelete = this.onDelete;
        relationship.onUpdate = this.onUpdate;

        // 验证
        const result = relationship.validate(this.schema);
        if (result.errors.length > 0) {
            alert('Validation failed:\n' + result.errors.map(e => e.message).join('\n'));
            return;
        }

        // 调用完成回调
        if (this.onComplete) {
            this.onComplete(relationship);
        }

        this.close();
    }

    /**
     * 关闭对话框
     */
    private close(): void {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
        this.dialog = null;

        if (this.onCancel) {
            this.onCancel();
        }
    }
}
