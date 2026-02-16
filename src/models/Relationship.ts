import { generateId } from '../utils/types';
import type { Schema } from './Schema';

export type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-many';
export type ReferentialAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

export interface ValidationError {
    code: string;
    message: string;
    field?: string;
    suggestion?: string;
}

export interface ValidationWarning {
    code: string;
    message: string;
    field?: string;
    suggestion?: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

/**
 * 关系模型
 */
export class Relationship {
    id: string;
    name?: string;
    type: RelationType;
    sourceTableId: string;
    targetTableId: string;
    sourceColumnId: string;
    targetColumnId: string;
    onDelete?: ReferentialAction;
    onUpdate?: ReferentialAction;
    comment?: string;

    constructor(
        id: string,
        type: RelationType,
        sourceTableId: string,
        targetTableId: string,
        sourceColumnId: string,
        targetColumnId: string
    ) {
        this.id = id;
        this.type = type;
        this.sourceTableId = sourceTableId;
        this.targetTableId = targetTableId;
        this.sourceColumnId = sourceColumnId;
        this.targetColumnId = targetColumnId;
    }

    toJSON(): object {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            sourceTableId: this.sourceTableId,
            targetTableId: this.targetTableId,
            sourceColumnId: this.sourceColumnId,
            targetColumnId: this.targetColumnId,
            onDelete: this.onDelete,
            onUpdate: this.onUpdate,
            comment: this.comment,
        };
    }

    static fromJSON(json: any): Relationship {
        const rel = new Relationship(
            json.id,
            json.type,
            json.sourceTableId,
            json.targetTableId,
            json.sourceColumnId,
            json.targetColumnId
        );
        rel.name = json.name;
        rel.onDelete = json.onDelete;
        rel.onUpdate = json.onUpdate;
        rel.comment = json.comment;
        return rel;
    }

    static create(
        type: RelationType,
        sourceTableId: string,
        targetTableId: string,
        sourceColumnId: string,
        targetColumnId: string
    ): Relationship {
        return new Relationship(
            generateId(),
            type,
            sourceTableId,
            targetTableId,
            sourceColumnId,
            targetColumnId
        );
    }

    /**
     * 验证关系的正确性
     */
    validate(schema: Schema): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // 1. 检查表存在性
        const sourceTable = schema.getTable(this.sourceTableId);
        const targetTable = schema.getTable(this.targetTableId);

        if (!sourceTable) {
            errors.push({
                code: 'SOURCE_TABLE_NOT_FOUND',
                message: `Source table with ID '${this.sourceTableId}' not found`,
                field: 'sourceTableId',
                suggestion: 'Remove this relationship or restore the source table'
            });
        }

        if (!targetTable) {
            errors.push({
                code: 'TARGET_TABLE_NOT_FOUND',
                message: `Target table with ID '${this.targetTableId}' not found`,
                field: 'targetTableId',
                suggestion: 'Remove this relationship or restore the target table'
            });
        }

        // 如果表不存在，无法继续验证
        if (!sourceTable || !targetTable) {
            return { valid: false, errors, warnings };
        }

        // 2. 检查字段存在性
        const sourceColumn = sourceTable.getColumn(this.sourceColumnId);
        const targetColumn = targetTable.getColumn(this.targetColumnId);

        if (!sourceColumn) {
            errors.push({
                code: 'SOURCE_COLUMN_NOT_FOUND',
                message: `Source column with ID '${this.sourceColumnId}' not found in table '${sourceTable.name}'`,
                field: 'sourceColumnId',
                suggestion: 'Select a valid column from the source table'
            });
        }

        if (!targetColumn) {
            errors.push({
                code: 'TARGET_COLUMN_NOT_FOUND',
                message: `Target column with ID '${this.targetColumnId}' not found in table '${targetTable.name}'`,
                field: 'targetColumnId',
                suggestion: 'Select a valid column from the target table'
            });
        }

        // 如果字段不存在，无法继续验证
        if (!sourceColumn || !targetColumn) {
            return { valid: false, errors, warnings };
        }

        // 3. 检查类型兼容性
        if (!this.areTypesCompatible(sourceColumn.type, targetColumn.type)) {
            errors.push({
                code: 'TYPE_MISMATCH',
                message: `Column types are incompatible: '${sourceColumn.type}' and '${targetColumn.type}'`,
                field: 'sourceColumnId',
                suggestion: 'Ensure both columns have compatible data types'
            });
        }

        // 4. 警告：目标字段应该是主键
        if (!targetColumn.primaryKey && !targetColumn.unique) {
            warnings.push({
                code: 'TARGET_NOT_PRIMARY_KEY',
                message: `Target column '${targetColumn.name}' is not a primary key or unique`,
                field: 'targetColumnId',
                suggestion: 'Consider making the target column a primary key or unique'
            });
        }

        // 5. 警告：源字段应该有索引
        // 注意：这需要检查表的索引，暂时简化处理
        if (!sourceColumn.primaryKey && !sourceColumn.unique) {
            warnings.push({
                code: 'SOURCE_NO_INDEX',
                message: `Source column '${sourceColumn.name}' should have an index for better performance`,
                field: 'sourceColumnId',
                suggestion: 'Add an index on the source column'
            });
        }

        // 6. 警告：命名规范
        if (this.type === 'one-to-many' || this.type === 'many-to-many') {
            const expectedName = `${targetTable.name.toLowerCase()}_id`;
            if (sourceColumn.name.toLowerCase() !== expectedName) {
                warnings.push({
                    code: 'NAMING_CONVENTION',
                    message: `Foreign key column '${sourceColumn.name}' doesn't follow naming convention`,
                    field: 'sourceColumnId',
                    suggestion: `Consider renaming to '${expectedName}'`
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 检查两个数据类型是否兼容
     */
    private areTypesCompatible(type1: string, type2: string): boolean {
        // 移除括号内的内容和空格，转换为大写
        const normalize = (type: string) => type.split('(')[0].trim().toUpperCase();
        
        const t1 = normalize(type1);
        const t2 = normalize(type2);

        // 完全相同
        if (t1 === t2) return true;

        // 数值类型组
        const numericTypes = ['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'NUMBER'];
        if (numericTypes.includes(t1) && numericTypes.includes(t2)) return true;

        // 字符类型组
        const stringTypes = ['VARCHAR', 'CHAR', 'TEXT', 'STRING', 'CLOB'];
        if (stringTypes.includes(t1) && stringTypes.includes(t2)) return true;

        // 日期类型组
        const dateTypes = ['DATE', 'DATETIME', 'TIMESTAMP', 'TIME'];
        if (dateTypes.includes(t1) && dateTypes.includes(t2)) return true;

        return false;
    }
}
