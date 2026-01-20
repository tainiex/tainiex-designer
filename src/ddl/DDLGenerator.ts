import { Schema } from '../models/Schema';
import { Table } from '../models/Table';
import { Relationship } from '../models/Relationship';

/**
 * DDL 生成器接口
 */
export interface DDLGenerator {
    generate(schema: Schema): string;
    generateTable(table: Table): string;
    generateRelationship(rel: Relationship, schema: Schema): string;
}
