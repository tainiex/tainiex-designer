import { generateId } from '../utils/types';

/**
 * 列/字段模型
 */
export class Column {
    id: string;
    name: string;
    type: string;
    nullable: boolean = true;
    primaryKey: boolean = false;
    foreignKey: boolean = false;
    unique: boolean = false;
    autoIncrement: boolean = false;
    defaultValue?: string;
    comment?: string;

    constructor(id: string, name: string, type: string) {
        this.id = id;
        this.name = name;
        this.type = type;
    }

    toJSON(): object {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            nullable: this.nullable,
            primaryKey: this.primaryKey,
            foreignKey: this.foreignKey,
            unique: this.unique,
            autoIncrement: this.autoIncrement,
            defaultValue: this.defaultValue,
            comment: this.comment,
        };
    }

    static fromJSON(json: any): Column {
        const col = new Column(json.id, json.name, json.type);
        col.nullable = json.nullable ?? true;
        col.primaryKey = json.primaryKey ?? false;
        col.foreignKey = json.foreignKey ?? false;
        col.unique = json.unique ?? false;
        col.autoIncrement = json.autoIncrement ?? false;
        col.defaultValue = json.defaultValue;
        col.comment = json.comment;
        return col;
    }

    static create(name: string, type: string): Column {
        return new Column(generateId(), name, type);
    }
}
