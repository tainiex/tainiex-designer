import { Table } from './Table';
import { Relationship } from './Relationship';

/**
 * 数据库模式（Schema）
 */
export class Schema {
    name: string = 'Untitled Schema';
    tables: Map<string, Table> = new Map();
    relationships: Map<string, Relationship> = new Map();
    metadata: Record<string, any> = {};

    addTable(table: Table): void {
        this.tables.set(table.id, table);
    }

    removeTable(id: string): void {
        this.tables.delete(id);

        // 删除相关的关系
        const toDelete: string[] = [];
        for (const [relId, rel] of this.relationships) {
            if (rel.sourceTableId === id || rel.targetTableId === id) {
                toDelete.push(relId);
            }
        }

        for (const relId of toDelete) {
            this.relationships.delete(relId);
        }
    }

    getTable(id: string): Table | undefined {
        return this.tables.get(id);
    }

    addRelationship(rel: Relationship): void {
        this.relationships.set(rel.id, rel);
    }

    removeRelationship(id: string): void {
        this.relationships.delete(id);
    }

    getRelationship(id: string): Relationship | undefined {
        return this.relationships.get(id);
    }

    toJSON(): object {
        return {
            name: this.name,
            tables: Array.from(this.tables.values()).map((t) => t.toJSON()),
            relationships: Array.from(this.relationships.values()).map((r) =>
                r.toJSON()
            ),
            metadata: this.metadata,
        };
    }

    static fromJSON(json: any): Schema {
        const schema = new Schema();
        schema.name = json.name || 'Untitled Schema';
        schema.metadata = json.metadata || {};

        for (const tableData of json.tables || []) {
            const table = Table.fromJSON(tableData);
            schema.addTable(table);
        }

        for (const relData of json.relationships || []) {
            const rel = Relationship.fromJSON(relData);
            schema.addRelationship(rel);
        }

        return schema;
    }

    clone(): Schema {
        return Schema.fromJSON(this.toJSON());
    }
}
