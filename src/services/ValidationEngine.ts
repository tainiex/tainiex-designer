import { Schema } from '../models/Schema';
import { Table } from '../models/Table';
import { Relationship, ValidationResult, ValidationError, ValidationWarning } from '../models/Relationship';

/**
 * 验证引擎 - 负责验证数据库模式的正确性
 */
export class ValidationEngine {
    private schema: Schema;

    constructor(schema: Schema) {
        this.schema = schema;
    }

    /**
     * 验证整个 Schema
     */
    validateSchema(): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // 1. 验证表
        const tableValidation = this.validateTables();
        errors.push(...tableValidation.errors);
        warnings.push(...tableValidation.warnings);

        // 2. 验证关系
        const relationshipValidation = this.validateRelationships();
        errors.push(...relationshipValidation.errors);
        warnings.push(...relationshipValidation.warnings);

        // 3. 检查循环依赖
        const circularValidation = this.checkCircularDependencies();
        warnings.push(...circularValidation.warnings);

        // 4. 检查孤立表
        const orphanValidation = this.checkOrphanTables();
        warnings.push(...orphanValidation.warnings);

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 验证所有表
     */
    private validateTables(): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        const tableNames = new Set<string>();

        for (const table of this.schema.tables.values()) {
            // 检查表名重复
            if (tableNames.has(table.name.toLowerCase())) {
                errors.push({
                    code: 'DUPLICATE_TABLE_NAME',
                    message: `Duplicate table name: '${table.name}'`,
                    field: table.id,
                    suggestion: 'Rename one of the tables with duplicate names'
                });
            }
            tableNames.add(table.name.toLowerCase());

            // 检查表名是否为空
            if (!table.name || table.name.trim() === '') {
                errors.push({
                    code: 'TABLE_EMPTY_NAME',
                    message: `Table has empty name`,
                    field: table.id,
                    suggestion: 'Provide a name for the table'
                });
            }

            // 检查表是否有字段
            if (table.columns.length === 0) {
                errors.push({
                    code: 'TABLE_NO_COLUMNS',
                    message: `Table '${table.name}' has no columns`,
                    field: table.id,
                    suggestion: 'Add at least one column to the table'
                });
            }

            // 检查主键
            const primaryKeys = table.getPrimaryKeys();
            if (primaryKeys.length === 0) {
                errors.push({
                    code: 'TABLE_NO_PRIMARY_KEY',
                    message: `Table '${table.name}' has no primary key`,
                    field: table.id,
                    suggestion: 'Add a primary key to the table'
                });
            }

            // 检查字段名重复
            const columnNames = new Set<string>();
            for (const column of table.columns) {
                if (columnNames.has(column.name.toLowerCase())) {
                    errors.push({
                        code: 'DUPLICATE_COLUMN_NAME',
                        message: `Duplicate column name '${column.name}' in table '${table.name}'`,
                        field: column.id,
                        suggestion: 'Rename one of the columns with duplicate names'
                    });
                }
                columnNames.add(column.name.toLowerCase());

                // 检查字段名是否为空
                if (!column.name || column.name.trim() === '') {
                    errors.push({
                        code: 'EMPTY_COLUMN_NAME',
                        message: `Column in table '${table.name}' has empty name`,
                        field: column.id,
                        suggestion: 'Provide a name for the column'
                    });
                }

                // 检查字段类型是否为空
                if (!column.type || column.type.trim() === '') {
                    errors.push({
                        code: 'EMPTY_COLUMN_TYPE',
                        message: `Column '${column.name}' in table '${table.name}' has empty type`,
                        field: column.id,
                        suggestion: 'Specify a data type for the column'
                    });
                }

                // 检查主键是否可为空
                if (column.primaryKey && column.nullable) {
                    errors.push({
                        code: 'PRIMARY_KEY_NULLABLE',
                        message: `Primary key column '${column.name}' in table '${table.name}' cannot be nullable`,
                        field: column.id,
                        suggestion: 'Set the column as NOT NULL'
                    });
                }

                // 检查自增字段是否为数值类型
                if (column.autoIncrement && !this.isNumericType(column.type)) {
                    errors.push({
                        code: 'AUTO_INCREMENT_NON_NUMERIC',
                        message: `Auto increment column '${column.name}' in table '${table.name}' must be numeric`,
                        field: column.id,
                        suggestion: 'Change the column type to a numeric type (INT, BIGINT, etc.)'
                    });
                }
            }
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * 验证所有关系
     */
    private validateRelationships(): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        for (const relationship of this.schema.relationships.values()) {
            const result = relationship.validate(this.schema);
            errors.push(...result.errors);
            warnings.push(...result.warnings);
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * 检查循环依赖
     */
    private checkCircularDependencies(): ValidationResult {
        const warnings: ValidationWarning[] = [];
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (tableId: string, path: string[]): boolean => {
            if (recursionStack.has(tableId)) {
                // 找到循环
                const cycleStart = path.indexOf(tableId);
                const cyclePath = path.slice(cycleStart).map(id => {
                    const table = this.schema.getTable(id);
                    return table ? table.name : id;
                }).join(' → ');

                warnings.push({
                    code: 'CIRCULAR_DEPENDENCY',
                    message: `Circular dependency detected: ${cyclePath}`,
                    field: tableId,
                    suggestion: 'Review the relationships to break the circular dependency'
                });
                return true;
            }

            if (visited.has(tableId)) {
                return false;
            }

            visited.add(tableId);
            recursionStack.add(tableId);
            path.push(tableId);

            // 查找所有从当前表出发的关系
            for (const rel of this.schema.relationships.values()) {
                if (rel.sourceTableId === tableId) {
                    if (hasCycle(rel.targetTableId, [...path])) {
                        // 已经记录了警告，继续检查其他路径
                    }
                }
            }

            recursionStack.delete(tableId);
            return false;
        };

        // 检查每个表
        for (const tableId of this.schema.tables.keys()) {
            if (!visited.has(tableId)) {
                hasCycle(tableId, []);
            }
        }

        return { valid: true, errors: [], warnings };
    }

    /**
     * 检查孤立表（没有任何关系的表）
     */
    private checkOrphanTables(): ValidationResult {
        const warnings: ValidationWarning[] = [];

        // 如果只有一个表或没有表，不检查
        if (this.schema.tables.size <= 1) {
            return { valid: true, errors: [], warnings };
        }

        const connectedTables = new Set<string>();

        // 收集所有有关系的表
        for (const rel of this.schema.relationships.values()) {
            connectedTables.add(rel.sourceTableId);
            connectedTables.add(rel.targetTableId);
        }

        // 检查孤立表
        for (const table of this.schema.tables.values()) {
            if (!connectedTables.has(table.id)) {
                warnings.push({
                    code: 'ORPHAN_TABLE',
                    message: `Table '${table.name}' has no relationships with other tables`,
                    field: table.id,
                    suggestion: 'Consider adding relationships or removing the table if not needed'
                });
            }
        }

        return { valid: true, errors: [], warnings };
    }

    /**
     * 检查是否为数值类型
     */
    private isNumericType(type: string): boolean {
        const normalizedType = type.split('(')[0].trim().toUpperCase();
        const numericTypes = [
            'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT',
            'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'NUMBER'
        ];
        return numericTypes.includes(normalizedType);
    }

    /**
     * 验证单个表
     */
    validateTable(tableId: string): ValidationResult {
        const table = this.schema.getTable(tableId);
        if (!table) {
            return {
                valid: false,
                errors: [{
                    code: 'TABLE_NOT_FOUND',
                    message: `Table with ID '${tableId}' not found`,
                    field: tableId,
                    suggestion: 'Check if the table exists'
                }],
                warnings: []
            };
        }

        // 重用 validateTables 的逻辑，但只针对单个表
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // 检查表名是否为空
        if (!table.name || table.name.trim() === '') {
            errors.push({
                code: 'TABLE_EMPTY_NAME',
                message: `Table has empty name`,
                field: table.id,
                suggestion: 'Provide a name for the table'
            });
        }

        // 检查表是否有字段
        if (table.columns.length === 0) {
            errors.push({
                code: 'TABLE_NO_COLUMNS',
                message: `Table '${table.name}' has no columns`,
                field: table.id,
                suggestion: 'Add at least one column to the table'
            });
        }

        // 检查主键
        const primaryKeys = table.getPrimaryKeys();
        if (primaryKeys.length === 0) {
            errors.push({
                code: 'TABLE_NO_PRIMARY_KEY',
                message: `Table '${table.name}' has no primary key`,
                field: table.id,
                suggestion: 'Add a primary key to the table'
            });
        }

        // 检查字段名重复
        const columnNames = new Set<string>();
        for (const column of table.columns) {
            if (columnNames.has(column.name.toLowerCase())) {
                errors.push({
                    code: 'DUPLICATE_COLUMN_NAME',
                    message: `Duplicate column name '${column.name}' in table '${table.name}'`,
                    field: column.id,
                    suggestion: 'Rename one of the columns with duplicate names'
                });
            }
            columnNames.add(column.name.toLowerCase());

            // 检查字段名是否为空
            if (!column.name || column.name.trim() === '') {
                errors.push({
                    code: 'COLUMN_EMPTY_NAME',
                    message: `Column in table '${table.name}' has empty name`,
                    field: column.id,
                    suggestion: 'Provide a name for the column'
                });
            }

            // 检查字段类型是否为空
            if (!column.type || column.type.trim() === '') {
                errors.push({
                    code: 'COLUMN_EMPTY_TYPE',
                    message: `Column '${column.name}' in table '${table.name}' has empty type`,
                    field: column.id,
                    suggestion: 'Specify a data type for the column'
                });
            }
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * 验证单个关系
     */
    validateRelationship(relationshipId: string): ValidationResult {
        const relationship = this.schema.getRelationship(relationshipId);
        if (!relationship) {
            return {
                valid: false,
                errors: [{
                    code: 'RELATIONSHIP_NOT_FOUND',
                    message: `Relationship with ID '${relationshipId}' not found`,
                    field: relationshipId,
                    suggestion: 'Check if the relationship exists'
                }],
                warnings: []
            };
        }

        return relationship.validate(this.schema);
    }
}
