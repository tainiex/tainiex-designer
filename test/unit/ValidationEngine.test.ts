import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationEngine } from '../../src/services/ValidationEngine';
import { Schema } from '../../src/models/Schema';
import { Table } from '../../src/models/Table';
import { Column } from '../../src/models/Column';
import { Relationship } from '../../src/models/Relationship';

describe('ValidationEngine', () => {
    let schema: Schema;

    beforeEach(() => {
        schema = new Schema();
        schema.name = 'Test Schema';
    });

    describe('validateSchema', () => {
        it('should validate an empty schema', () => {
            const engine = new ValidationEngine(schema);
            const result = engine.validateSchema();

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.warnings).toHaveLength(0);
        });

        it('should validate a simple valid schema', () => {
            const table = Table.create('users', 0, 0);
            const idCol = Column.create('id', 'INT');
            idCol.primaryKey = true;
            idCol.nullable = false; // Primary keys must not be nullable
            table.addColumn(idCol);
            schema.addTable(table);

            const engine = new ValidationEngine(schema);
            const result = engine.validateSchema();

            // Schema is valid (no errors)
            expect(result.errors).toHaveLength(0);
        });

        it('should detect duplicate table names', () => {
            const table1 = Table.create('users', 0, 0);
            const table2 = Table.create('users', 100, 100);
            schema.addTable(table1);
            schema.addTable(table2);

            const engine = new ValidationEngine(schema);
            const result = engine.validateSchema();

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'DUPLICATE_TABLE_NAME')).toBe(true);
        });

        it('should detect tables without columns', () => {
            const table = Table.create('empty_table', 0, 0);
            schema.addTable(table);

            const engine = new ValidationEngine(schema);
            const result = engine.validateSchema();

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'TABLE_NO_COLUMNS')).toBe(true);
        });

        it('should detect tables without primary key', () => {
            const table = Table.create('users', 0, 0);
            const col = Column.create('name', 'VARCHAR(50)');
            table.addColumn(col);
            schema.addTable(table);

            const engine = new ValidationEngine(schema);
            const result = engine.validateSchema();

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'TABLE_NO_PRIMARY_KEY')).toBe(true);
        });

        it('should detect duplicate column names in a table', () => {
            const table = Table.create('users', 0, 0);
            const col1 = Column.create('id', 'INT');
            const col2 = Column.create('id', 'INT');
            col1.primaryKey = true;
            table.addColumn(col1);
            table.addColumn(col2);
            schema.addTable(table);

            const engine = new ValidationEngine(schema);
            const result = engine.validateSchema();

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'DUPLICATE_COLUMN_NAME')).toBe(true);
        });

        it('should detect circular dependencies', () => {
            // 创建两个表
            const table1 = Table.create('table1', 0, 0);
            const t1_id = Column.create('id', 'INT');
            t1_id.primaryKey = true;
            const t1_fk = Column.create('table2_id', 'INT');
            t1_fk.foreignKey = true;
            table1.addColumn(t1_id);
            table1.addColumn(t1_fk);

            const table2 = Table.create('table2', 100, 100);
            const t2_id = Column.create('id', 'INT');
            t2_id.primaryKey = true;
            const t2_fk = Column.create('table1_id', 'INT');
            t2_fk.foreignKey = true;
            table2.addColumn(t2_id);
            table2.addColumn(t2_fk);

            schema.addTable(table1);
            schema.addTable(table2);

            // 创建循环依赖
            const rel1 = Relationship.create('one-to-many', table1.id, table2.id, t1_fk.id, t2_id.id);
            const rel2 = Relationship.create('one-to-many', table2.id, table1.id, t2_fk.id, t1_id.id);
            schema.addRelationship(rel1);
            schema.addRelationship(rel2);

            const engine = new ValidationEngine(schema);
            const result = engine.validateSchema();

            expect(result.warnings.some(w => w.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
        });

        it('should detect orphan tables', () => {
            const table1 = Table.create('users', 0, 0);
            const id1 = Column.create('id', 'INT');
            id1.primaryKey = true;
            table1.addColumn(id1);

            const table2 = Table.create('posts', 100, 100);
            const id2 = Column.create('id', 'INT');
            id2.primaryKey = true;
            table2.addColumn(id2);

            const table3 = Table.create('orphan', 200, 200);
            const id3 = Column.create('id', 'INT');
            id3.primaryKey = true;
            table3.addColumn(id3);

            schema.addTable(table1);
            schema.addTable(table2);
            schema.addTable(table3);

            // 只在 table1 和 table2 之间创建关系
            const fk = Column.create('user_id', 'INT');
            table2.addColumn(fk);
            const rel = Relationship.create('one-to-many', table2.id, table1.id, fk.id, id1.id);
            schema.addRelationship(rel);

            const engine = new ValidationEngine(schema);
            const result = engine.validateSchema();

            expect(result.warnings.some(w => w.code === 'ORPHAN_TABLE' && w.message.includes('orphan'))).toBe(true);
        });
    });

    describe('validateTable', () => {
        it('should validate a correct table', () => {
            const table = Table.create('users', 0, 0);
            const idCol = Column.create('id', 'INT');
            idCol.primaryKey = true;
            table.addColumn(idCol);
            schema.addTable(table);

            const engine = new ValidationEngine(schema);
            const result = engine.validateTable(table.id);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect empty table name', () => {
            const table = Table.create('', 0, 0);
            const idCol = Column.create('id', 'INT');
            idCol.primaryKey = true;
            table.addColumn(idCol);
            schema.addTable(table);

            const engine = new ValidationEngine(schema);
            const result = engine.validateTable(table.id);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'TABLE_EMPTY_NAME')).toBe(true);
        });

        it('should detect table without columns', () => {
            const table = Table.create('users', 0, 0);
            schema.addTable(table);

            const engine = new ValidationEngine(schema);
            const result = engine.validateTable(table.id);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'TABLE_NO_COLUMNS')).toBe(true);
        });

        it('should detect table without primary key', () => {
            const table = Table.create('users', 0, 0);
            const col = Column.create('name', 'VARCHAR(50)');
            table.addColumn(col);
            schema.addTable(table);

            const engine = new ValidationEngine(schema);
            const result = engine.validateTable(table.id);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'TABLE_NO_PRIMARY_KEY')).toBe(true);
        });

        it('should detect duplicate column names', () => {
            const table = Table.create('users', 0, 0);
            const col1 = Column.create('id', 'INT');
            const col2 = Column.create('id', 'VARCHAR(50)');
            col1.primaryKey = true;
            table.addColumn(col1);
            table.addColumn(col2);
            schema.addTable(table);

            const engine = new ValidationEngine(schema);
            const result = engine.validateTable(table.id);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'DUPLICATE_COLUMN_NAME')).toBe(true);
        });

        it('should detect empty column name', () => {
            const table = Table.create('users', 0, 0);
            const col1 = Column.create('id', 'INT');
            const col2 = Column.create('', 'VARCHAR(50)');
            col1.primaryKey = true;
            table.addColumn(col1);
            table.addColumn(col2);
            schema.addTable(table);

            const engine = new ValidationEngine(schema);
            const result = engine.validateTable(table.id);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'COLUMN_EMPTY_NAME')).toBe(true);
        });

        it('should detect empty column type', () => {
            const table = Table.create('users', 0, 0);
            const col1 = Column.create('id', 'INT');
            const col2 = Column.create('name', '');
            col1.primaryKey = true;
            table.addColumn(col1);
            table.addColumn(col2);
            schema.addTable(table);

            const engine = new ValidationEngine(schema);
            const result = engine.validateTable(table.id);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'COLUMN_EMPTY_TYPE')).toBe(true);
        });
    });

    describe('validateRelationship', () => {
        let usersTable: Table;
        let postsTable: Table;
        let userIdColumn: Column;
        let postUserIdColumn: Column;

        beforeEach(() => {
            usersTable = Table.create('users', 0, 0);
            userIdColumn = Column.create('id', 'INT');
            userIdColumn.primaryKey = true;
            usersTable.addColumn(userIdColumn);
            schema.addTable(usersTable);

            postsTable = Table.create('posts', 100, 100);
            const postIdColumn = Column.create('id', 'INT');
            postIdColumn.primaryKey = true;
            postsTable.addColumn(postIdColumn);
            postUserIdColumn = Column.create('user_id', 'INT');
            postUserIdColumn.foreignKey = true;
            postsTable.addColumn(postUserIdColumn);
            schema.addTable(postsTable);
        });

        it('should validate a correct relationship', () => {
            const rel = Relationship.create(
                'one-to-many',
                postsTable.id,
                usersTable.id,
                postUserIdColumn.id,
                userIdColumn.id
            );
            schema.addRelationship(rel);

            const engine = new ValidationEngine(schema);
            const result = engine.validateRelationship(rel.id);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect missing source table', () => {
            const rel = Relationship.create(
                'one-to-many',
                'non-existent',
                usersTable.id,
                postUserIdColumn.id,
                userIdColumn.id
            );
            schema.addRelationship(rel);

            const engine = new ValidationEngine(schema);
            const result = engine.validateRelationship(rel.id);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'SOURCE_TABLE_NOT_FOUND')).toBe(true);
        });

        it('should detect missing target table', () => {
            const rel = Relationship.create(
                'one-to-many',
                postsTable.id,
                'non-existent',
                postUserIdColumn.id,
                userIdColumn.id
            );
            schema.addRelationship(rel);

            const engine = new ValidationEngine(schema);
            const result = engine.validateRelationship(rel.id);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'TARGET_TABLE_NOT_FOUND')).toBe(true);
        });
    });

    describe('checkCircularDependencies', () => {
        it('should not detect circular dependencies in a simple chain', () => {
            const table1 = Table.create('table1', 0, 0);
            const t1_id = Column.create('id', 'INT');
            t1_id.primaryKey = true;
            table1.addColumn(t1_id);

            const table2 = Table.create('table2', 100, 100);
            const t2_id = Column.create('id', 'INT');
            t2_id.primaryKey = true;
            const t2_fk = Column.create('table1_id', 'INT');
            table2.addColumn(t2_id);
            table2.addColumn(t2_fk);

            const table3 = Table.create('table3', 200, 200);
            const t3_id = Column.create('id', 'INT');
            t3_id.primaryKey = true;
            const t3_fk = Column.create('table2_id', 'INT');
            table3.addColumn(t3_id);
            table3.addColumn(t3_fk);

            schema.addTable(table1);
            schema.addTable(table2);
            schema.addTable(table3);

            const rel1 = Relationship.create('one-to-many', table2.id, table1.id, t2_fk.id, t1_id.id);
            const rel2 = Relationship.create('one-to-many', table3.id, table2.id, t3_fk.id, t2_id.id);
            schema.addRelationship(rel1);
            schema.addRelationship(rel2);

            const engine = new ValidationEngine(schema);
            const result = engine.validateSchema();

            expect(result.warnings.some(w => w.code === 'CIRCULAR_DEPENDENCY')).toBe(false);
        });

        it('should detect direct circular dependency', () => {
            const table1 = Table.create('table1', 0, 0);
            const t1_id = Column.create('id', 'INT');
            t1_id.primaryKey = true;
            const t1_fk = Column.create('table2_id', 'INT');
            table1.addColumn(t1_id);
            table1.addColumn(t1_fk);

            const table2 = Table.create('table2', 100, 100);
            const t2_id = Column.create('id', 'INT');
            t2_id.primaryKey = true;
            const t2_fk = Column.create('table1_id', 'INT');
            table2.addColumn(t2_id);
            table2.addColumn(t2_fk);

            schema.addTable(table1);
            schema.addTable(table2);

            const rel1 = Relationship.create('one-to-many', table1.id, table2.id, t1_fk.id, t2_id.id);
            const rel2 = Relationship.create('one-to-many', table2.id, table1.id, t2_fk.id, t1_id.id);
            schema.addRelationship(rel1);
            schema.addRelationship(rel2);

            const engine = new ValidationEngine(schema);
            const result = engine.validateSchema();

            expect(result.warnings.some(w => w.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
        });

        it('should detect indirect circular dependency', () => {
            const table1 = Table.create('table1', 0, 0);
            const t1_id = Column.create('id', 'INT');
            t1_id.primaryKey = true;
            const t1_fk = Column.create('table2_id', 'INT');
            table1.addColumn(t1_id);
            table1.addColumn(t1_fk);

            const table2 = Table.create('table2', 100, 100);
            const t2_id = Column.create('id', 'INT');
            t2_id.primaryKey = true;
            const t2_fk = Column.create('table3_id', 'INT');
            table2.addColumn(t2_id);
            table2.addColumn(t2_fk);

            const table3 = Table.create('table3', 200, 200);
            const t3_id = Column.create('id', 'INT');
            t3_id.primaryKey = true;
            const t3_fk = Column.create('table1_id', 'INT');
            table3.addColumn(t3_id);
            table3.addColumn(t3_fk);

            schema.addTable(table1);
            schema.addTable(table2);
            schema.addTable(table3);

            const rel1 = Relationship.create('one-to-many', table1.id, table2.id, t1_fk.id, t2_id.id);
            const rel2 = Relationship.create('one-to-many', table2.id, table3.id, t2_fk.id, t3_id.id);
            const rel3 = Relationship.create('one-to-many', table3.id, table1.id, t3_fk.id, t1_id.id);
            schema.addRelationship(rel1);
            schema.addRelationship(rel2);
            schema.addRelationship(rel3);

            const engine = new ValidationEngine(schema);
            const result = engine.validateSchema();

            expect(result.warnings.some(w => w.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
        });
    });
});
