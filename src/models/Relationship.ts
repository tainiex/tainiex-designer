import { generateId } from '../utils/types';

export type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-many';
export type ReferentialAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

/**
 * 关系模型
 */
export class Relationship {
    id: string;
    type: RelationType;
    sourceTableId: string;
    targetTableId: string;
    sourceColumnId: string;
    targetColumnId: string;
    onDelete?: ReferentialAction;
    onUpdate?: ReferentialAction;

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
            type: this.type,
            sourceTableId: this.sourceTableId,
            targetTableId: this.targetTableId,
            sourceColumnId: this.sourceColumnId,
            targetColumnId: this.targetColumnId,
            onDelete: this.onDelete,
            onUpdate: this.onUpdate,
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
        rel.onDelete = json.onDelete;
        rel.onUpdate = json.onUpdate;
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
}
