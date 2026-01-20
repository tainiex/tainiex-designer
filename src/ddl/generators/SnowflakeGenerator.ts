import { DDLGenerator } from '../DDLGenerator';
import { Schema } from '../../models/Schema';
import { Table } from '../../models/Table';
import { Relationship } from '../../models/Relationship';

/**
 * Snowflake DDL 生成器
 */
export class SnowflakeGenerator implements DDLGenerator {
    generate(schema: Schema): string {
        const lines: string[] = [];
        lines.push(`-- Generated for Snowflake by Tainiex Designer`);
        lines.push(`-- Schema: ${schema.name}\n`);

        // 首先生成表
        for (const table of schema.tables.values()) {
            lines.push(this.generateTable(table));
            lines.push('');
        }

        // 后生成约束/关系 (Snowflake 通常不在 CREATE TABLE 时定义外键，或者使用 ALTER)
        for (const rel of schema.relationships.values()) {
            const relSql = this.generateRelationship(rel, schema);
            if (relSql) {
                lines.push(relSql);
            }
        }

        return lines.join('\n');
    }

    generateTable(table: Table): string {
        const lines: string[] = [];
        lines.push(`CREATE OR REPLACE TABLE ${table.name.toUpperCase()} (`);

        const columnLines = table.columns.map((col, index) => {
            let line = `  ${col.name.toUpperCase()} ${this.mapType(col.type)}`;

            if (!col.nullable) {
                line += ' NOT NULL';
            }

            if (col.primaryKey) {
                line += ' PRIMARY KEY';
            }

            if (col.defaultValue) {
                line += ` DEFAULT ${col.defaultValue}`;
            }

            if (col.comment) {
                line += ` COMMENT '${col.comment.replace(/'/g, "''")}'`;
            }

            return line + (index === table.columns.length - 1 ? '' : ',');
        });

        lines.push(...columnLines);
        lines.push(`)${table.comment ? ` COMMENT = '${table.comment.replace(/'/g, "''")}'` : ''};`);

        return lines.join('\n');
    }

    generateRelationship(rel: Relationship, schema: Schema): string {
        const sourceTable = schema.getTable(rel.sourceTableId);
        const targetTable = schema.getTable(rel.targetTableId);

        if (!sourceTable || !targetTable) return '';

        const sourceCol = sourceTable.getColumn(rel.sourceColumnId);
        const targetCol = targetTable.getColumn(rel.targetColumnId);

        if (!sourceCol || !targetCol) return '';

        // Snowflake 外键语法
        return `ALTER TABLE ${sourceTable.name.toUpperCase()} ADD CONSTRAINT FK_${sourceTable.name.toUpperCase()}_${targetTable.name.toUpperCase()} 
  FOREIGN KEY (${sourceCol.name.toUpperCase()}) REFERENCES ${targetTable.name.toUpperCase()} (${targetCol.name.toUpperCase()});`;
    }

    private mapType(type: string): string {
        const t = type.toUpperCase();
        if (t === 'INT' || t === 'INTEGER') return 'NUMBER';
        if (t.includes('VARCHAR')) return t.replace('VARCHAR', 'STRING');
        if (t === 'TIMESTAMP') return 'TIMESTAMP_NTZ';
        if (t === 'TEXT') return 'STRING';
        return t;
    }
}
