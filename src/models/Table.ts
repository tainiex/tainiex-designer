import { Column } from './Column';
import { Point, generateId } from '../utils/types';

export interface Index {
    name: string;
    columns: string[];
    unique: boolean;
}

export interface Constraint {
    type: 'CHECK' | 'UNIQUE' | 'FOREIGN_KEY';
    definition: string;
}

/**
 * 表/实体模型
 */
export class Table {
    id: string;
    name: string;
    position: Point;
    columns: Column[] = [];
    indexes: Index[] = [];
    constraints: Constraint[] = [];
    comment?: string;

    constructor(id: string, name: string, x: number, y: number) {
        this.id = id;
        this.name = name;
        this.position = { x, y };
    }

    addColumn(column: Column): void {
        this.columns.push(column);
    }

    removeColumn(columnId: string): void {
        this.columns = this.columns.filter((c) => c.id !== columnId);
    }

    getColumn(columnId: string): Column | undefined {
        return this.columns.find((c) => c.id === columnId);
    }

    getPrimaryKeys(): Column[] {
        return this.columns.filter((c) => c.primaryKey);
    }

    getForeignKeys(): Column[] {
        return this.columns.filter((c) => c.foreignKey);
    }

    toJSON(): object {
        return {
            id: this.id,
            name: this.name,
            position: this.position,
            columns: this.columns.map((c) => c.toJSON()),
            indexes: this.indexes,
            constraints: this.constraints,
            comment: this.comment,
        };
    }

    static fromJSON(json: any): Table {
        const table = new Table(
            json.id,
            json.name,
            json.position.x,
            json.position.y
        );
        table.comment = json.comment;
        table.indexes = json.indexes || [];
        table.constraints = json.constraints || [];

        for (const colData of json.columns || []) {
            table.addColumn(Column.fromJSON(colData));
        }

        return table;
    }

    static create(name: string, x: number, y: number): Table {
        return new Table(generateId(), name, x, y);
    }
}
