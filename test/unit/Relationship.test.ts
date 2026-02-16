import { describe, it, expect, beforeEach } from 'vitest';
import { Relationship } from '../../src/models/Relationship';
import { Schema } from '../../src/models/Schema';
import { Table } from '../../src/models/Table';
import { Column } from '../../src/models/Column';

describe('Relationship', () => {
    let schema: Schema;
    let usersTable: Table;
    let postsTable: Table;
    let userIdColumn: Column;
    let postIdColumn: Column;
    let postUserIdColumn: Column;

    beforeEach(() => {
        // 创建测试 schema
        schema = new Schema();
        schema.name = 'Test Schema';

        // 创建 users 表
        usersTable = Table.create('users', 0, 0);
        userIdColumn = Column.create('id', 'INT');
        userIdColumn.primaryKey = true;
        userIdColumn.autoIncrement = true;
        usersTable.addColumn(userIdColumn);

        const usernameColumn = Column.create('username', 'VARCHAR(50)');
        usernameColumn.nullable = false;
        usersTable.addColumn(usernameColumn);

        schema.addTable(usersTable);

        // 创建 posts 表
        postsTable = Table.create('posts', 100, 100);
        postIdColumn = Column.create('id', 'INT');
        postIdColumn.primaryKey = true;
        postIdColumn.autoIncrement = true;
        postsTable.addColumn(postIdColumn);

        postUserIdColumn = Column.create('user_id', 'INT');
        postUserIdColumn.foreignKey = true;
        postsTable.addColumn(postUserIdColumn);

        const titleColumn = Column.create('title', 'VARCHAR(200)');
        postsTable.addColumn(titleColumn);

        schema.addTable(postsTable);
    });

    describe('constructor', () => {
        it('should create a relationship with required fields', () => {
            const rel = new Relationship(
                'rel1',
                'one-to-many',
                usersTable.id,
                postsTable.id,
                userIdColumn.id,
                postUserIdColumn.id
            );

            expect(rel.id).toBe('rel1');
            expect(rel.type).toBe('one-to-many');
            expect(rel.sourceTableId).toBe(usersTable.id);
            expect(rel.targetTableId).toBe(postsTable.id);
            expect(rel.sourceColumnId).toBe(userIdColumn.id);
            expect(rel.targetColumnId).toBe(postUserIdColumn.id);
        });
    });

    describe('create', () => {
        it('should create a relationship with auto-generated ID', () => {
            const rel = Relationship.create(
                'one-to-many',
                usersTable.id,
                postsTable.id,
                userIdColumn.id,
                postUserIdColumn.id
            );

            expect(rel.id).toBeDefined();
            expect(rel.id.length).toBeGreaterThan(0);
            expect(rel.type).toBe('one-to-many');
        });
    });

    describe('toJSON and fromJSON', () => {
        it('should serialize and deserialize basic relationship', () => {
            const rel = Relationship.create(
                'one-to-many',
                usersTable.id,
                postsTable.id,
                userIdColumn.id,
                postUserIdColumn.id
            );

            const json = rel.toJSON();
            const restored = Relationship.fromJSON(json);

            expect(restored.id).toBe(rel.id);
            expect(restored.type).toBe(rel.type);
            expect(restored.sourceTableId).toBe(rel.sourceTableId);
            expect(restored.targetTableId).toBe(rel.targetTableId);
            expect(restored.sourceColumnId).toBe(rel.sourceColumnId);
            expect(restored.targetColumnId).toBe(rel.targetColumnId);
        });

        it('should serialize and deserialize relationship with all fields', () => {
            const rel = Relationship.create(
                'one-to-many',
                usersTable.id,
                postsTable.id,
                userIdColumn.id,
                postUserIdColumn.id
            );
            rel.name = 'user_posts';
            rel.comment = 'User to posts relationship';
            rel.onDelete = 'CASCADE';
            rel.onUpdate = 'RESTRICT';

            const json = rel.toJSON();
            const restored = Relationship.fromJSON(json);

            expect(restored.name).toBe('user_posts');
            expect(restored.comment).toBe('User to posts relationship');
            expect(restored.onDelete).toBe('CASCADE');
            expect(restored.onUpdate).toBe('RESTRICT');
        });
    });

    describe('validate', () => {
        it('should validate a correct relationship', () => {
            const rel = Relationship.create(
                'one-to-many',
                postsTable.id,
                usersTable.id,
                postUserIdColumn.id,
                userIdColumn.id
            );

            const result = rel.validate(schema);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect missing source table', () => {
            const rel = Relationship.create(
                'one-to-many',
                'non-existent-table',
                usersTable.id,
                postUserIdColumn.id,
                userIdColumn.id
            );

            const result = rel.validate(schema);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].code).toBe('SOURCE_TABLE_NOT_FOUND');
            expect(result.errors[0].field).toBe('sourceTableId');
        });

        it('should detect missing target table', () => {
            const rel = Relationship.create(
                'one-to-many',
                usersTable.id,
                'non-existent-table',
                userIdColumn.id,
                postUserIdColumn.id
            );

            const result = rel.validate(schema);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].code).toBe('TARGET_TABLE_NOT_FOUND');
            expect(result.errors[0].field).toBe('targetTableId');
        });

        it('should detect missing source column', () => {
            const rel = Relationship.create(
                'one-to-many',
                postsTable.id,
                usersTable.id,
                'non-existent-column',
                userIdColumn.id
            );

            const result = rel.validate(schema);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].code).toBe('SOURCE_COLUMN_NOT_FOUND');
            expect(result.errors[0].field).toBe('sourceColumnId');
        });

        it('should detect missing target column', () => {
            const rel = Relationship.create(
                'one-to-many',
                postsTable.id,
                usersTable.id,
                postUserIdColumn.id,
                'non-existent-column'
            );

            const result = rel.validate(schema);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].code).toBe('TARGET_COLUMN_NOT_FOUND');
            expect(result.errors[0].field).toBe('targetColumnId');
        });

        it('should detect type mismatch', () => {
            // 创建一个字符串类型的列
            const stringColumn = Column.create('name', 'VARCHAR(100)');
            usersTable.addColumn(stringColumn);

            const rel = Relationship.create(
                'one-to-many',
                postsTable.id,
                usersTable.id,
                postUserIdColumn.id,
                stringColumn.id
            );

            const result = rel.validate(schema);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'TYPE_MISMATCH')).toBe(true);
        });

        it('should warn when target column is not primary key or unique', () => {
            // 创建一个普通列作为目标
            const normalColumn = Column.create('some_id', 'INT');
            usersTable.addColumn(normalColumn);

            const rel = Relationship.create(
                'one-to-many',
                postsTable.id,
                usersTable.id,
                postUserIdColumn.id,
                normalColumn.id
            );

            const result = rel.validate(schema);

            expect(result.warnings.some(w => w.code === 'TARGET_NOT_PRIMARY_KEY')).toBe(true);
        });

        it('should warn when source column has no index', () => {
            const rel = Relationship.create(
                'one-to-many',
                postsTable.id,
                usersTable.id,
                postUserIdColumn.id,
                userIdColumn.id
            );

            const result = rel.validate(schema);

            expect(result.warnings.some(w => w.code === 'SOURCE_NO_INDEX')).toBe(true);
        });

        it('should warn about naming convention', () => {
            // 创建一个命名不规范的外键列
            const badNameColumn = Column.create('bad_name', 'INT');
            postsTable.addColumn(badNameColumn);

            const rel = Relationship.create(
                'one-to-many',
                postsTable.id,
                usersTable.id,
                badNameColumn.id,
                userIdColumn.id
            );

            const result = rel.validate(schema);

            expect(result.warnings.some(w => w.code === 'NAMING_CONVENTION')).toBe(true);
        });
    });

    describe('type compatibility', () => {
        it('should accept same types', () => {
            const col1 = Column.create('col1', 'INT');
            const col2 = Column.create('col2', 'INT');
            usersTable.addColumn(col1);
            postsTable.addColumn(col2);

            const rel = Relationship.create(
                'one-to-many',
                postsTable.id,
                usersTable.id,
                col2.id,
                col1.id
            );

            const result = rel.validate(schema);
            expect(result.errors.some(e => e.code === 'TYPE_MISMATCH')).toBe(false);
        });

        it('should accept compatible numeric types', () => {
            const col1 = Column.create('col1', 'INT');
            const col2 = Column.create('col2', 'BIGINT');
            usersTable.addColumn(col1);
            postsTable.addColumn(col2);

            const rel = Relationship.create(
                'one-to-many',
                postsTable.id,
                usersTable.id,
                col2.id,
                col1.id
            );

            const result = rel.validate(schema);
            expect(result.errors.some(e => e.code === 'TYPE_MISMATCH')).toBe(false);
        });

        it('should accept compatible string types', () => {
            const col1 = Column.create('col1', 'VARCHAR(50)');
            const col2 = Column.create('col2', 'CHAR(50)');
            usersTable.addColumn(col1);
            postsTable.addColumn(col2);

            const rel = Relationship.create(
                'one-to-many',
                postsTable.id,
                usersTable.id,
                col2.id,
                col1.id
            );

            const result = rel.validate(schema);
            expect(result.errors.some(e => e.code === 'TYPE_MISMATCH')).toBe(false);
        });

        it('should reject incompatible types', () => {
            const col1 = Column.create('col1', 'INT');
            const col2 = Column.create('col2', 'VARCHAR(50)');
            usersTable.addColumn(col1);
            postsTable.addColumn(col2);

            const rel = Relationship.create(
                'one-to-many',
                postsTable.id,
                usersTable.id,
                col2.id,
                col1.id
            );

            const result = rel.validate(schema);
            expect(result.errors.some(e => e.code === 'TYPE_MISMATCH')).toBe(true);
        });
    });
});
