# 数据模型详细设计

## 1. 模型概览

### 1.1 实体关系图

```
┌─────────────────────────────────────────┐
│              Schema                     │
│  - name: string                         │
│  - tables: Map<string, Table>           │
│  - relationships: Map<string, Rel>      │
│  - metadata: Record<string, any>        │
└──────────────┬──────────────────────────┘
               │
               │ 1:N
               ↓
┌─────────────────────────────────────────┐
│              Table                      │
│  - id: string                           │
│  - name: string                         │
│  - position: Point                      │
│  - columns: Column[]                    │
│  - indexes: Index[]                     │
│  - constraints: Constraint[]            │
│  - comment?: string                     │
└──────────────┬──────────────────────────┘
               │
               │ 1:N
               ↓
┌─────────────────────────────────────────┐
│             Column                      │
│  - id: string                           │
│  - name: string                         │
│  - type: string                         │
│  - nullable: boolean                    │
│  - primaryKey: boolean                  │
│  - foreignKey: boolean                  │
│  - unique: boolean                      │
│  - autoIncrement: boolean               │
│  - defaultValue?: string                │
│  - comment?: string                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│          Relationship                   │
│  - id: string                           │
│  - type: RelationType                   │
│  - sourceTableId: string                │
│  - targetTableId: string                │
│  - sourceColumnId: string               │
│  - targetColumnId: string               │
│  - onDelete?: CascadeAction             │
│  - onUpdate?: CascadeAction             │
└─────────────────────────────────────────┘
```

## 2. Schema

### 2.1 职责

- 管理所有表和关系
- 提供增删改查接口
- 序列化和反序列化
- 数据完整性验证

### 2.2 接口设计

```typescript
class Schema {
  name: string = 'Untitled Schema';
  tables: Map<string, Table> = new Map();
  relationships: Map<string, Relationship> = new Map();
  metadata: Record<string, any> = {};
  
  // 表管理
  addTable(table: Table): void;
  removeTable(id: string): void;
  getTable(id: string): Table | undefined;
  getAllTables(): Table[];
  
  // 关系管理
  addRelationship(rel: Relationship): void;
  removeRelationship(id: string): void;
  getRelationship(id: string): Relationship | undefined;
  getAllRelationships(): Relationship[];
  
  // 查询
  getTablesByName(name: string): Table[];
  getRelationshipsForTable(tableId: string): Relationship[];
  
  // 序列化
  toJSON(): object;
  static fromJSON(json: any): Schema;
  clone(): Schema;
  
  // 验证
  validate(): ValidationResult;
}
```

### 2.3 级联删除

```typescript
removeTable(id: string): void {
  // 1. 删除表
  this.tables.delete(id);
  
  // 2. 删除相关的关系
  const toDelete: string[] = [];
  for (const [relId, rel] of this.relationships) {
    if (rel.sourceTableId === id || rel.targetTableId === id) {
      toDelete.push(relId);
    }
  }
  
  for (const relId of toDelete) {
    this.relationships.delete(relId);
  }
  
  // 3. 发送事件通知
  window.dispatchEvent(new CustomEvent('schema-changed', {
    detail: { type: 'table-removed', tableId: id }
  }));
}
```

### 2.4 数据验证

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  target?: string; // table id or relationship id
}

validate(): ValidationResult {
  const errors: ValidationError[] = [];
  
  // 检查表名重复
  const tableNames = new Set<string>();
  for (const table of this.tables.values()) {
    if (tableNames.has(table.name)) {
      errors.push({
        type: 'error',
        message: `Duplicate table name: ${table.name}`,
        target: table.id
      });
    }
    tableNames.add(table.name);
  }
  
  // 检查关系完整性
  for (const rel of this.relationships.values()) {
    const sourceTable = this.getTable(rel.sourceTableId);
    const targetTable = this.getTable(rel.targetTableId);
    
    if (!sourceTable || !targetTable) {
      errors.push({
        type: 'error',
        message: 'Relationship references non-existent table',
        target: rel.id
      });
    }
  }
  
  // 检查主键
  for (const table of this.tables.values()) {
    const pks = table.getPrimaryKeys();
    if (pks.length === 0) {
      errors.push({
        type: 'warning',
        message: `Table ${table.name} has no primary key`,
        target: table.id
      });
    }
  }
  
  return {
    valid: errors.filter(e => e.type === 'error').length === 0,
    errors
  };
}
```

## 3. Table

### 3.1 职责

- 存储表的元数据
- 管理字段列表
- 管理索引和约束
- 提供查询接口

### 3.2 接口设计

```typescript
class Table {
  id: string;
  name: string;
  position: Point;
  columns: Column[] = [];
  indexes: Index[] = [];
  constraints: Constraint[] = [];
  comment?: string;
  
  // 字段管理
  addColumn(column: Column): void;
  removeColumn(columnId: string): void;
  getColumn(columnId: string): Column | undefined;
  moveColumn(columnId: string, newIndex: number): void;
  
  // 查询
  getPrimaryKeys(): Column[];
  getForeignKeys(): Column[];
  getColumnByName(name: string): Column | undefined;
  
  // 索引管理
  addIndex(index: Index): void;
  removeIndex(indexName: string): void;
  
  // 约束管理
  addConstraint(constraint: Constraint): void;
  removeConstraint(constraintName: string): void;
  
  // 序列化
  toJSON(): object;
  static fromJSON(json: any): Table;
  static create(name: string, x: number, y: number): Table;
  
  // 工具方法
  getBounds(): Rect;
  containsPoint(point: Point): boolean;
}
```

### 3.3 工厂方法

```typescript
static create(name: string, x: number, y: number): Table {
  const table = new Table(generateId(), name, x, y);
  
  // 添加默认的 id 字段
  const idColumn = Column.create('id', 'INT');
  idColumn.primaryKey = true;
  idColumn.autoIncrement = true;
  idColumn.nullable = false;
  table.addColumn(idColumn);
  
  return table;
}
```

### 3.4 边界计算

```typescript
getBounds(): Rect {
  const width = 200;
  const headerHeight = 30;
  const rowHeight = 25;
  const totalHeight = headerHeight + this.columns.length * rowHeight;
  
  return {
    x: this.position.x,
    y: this.position.y,
    width,
    height: totalHeight
  };
}

containsPoint(point: Point): boolean {
  const bounds = this.getBounds();
  return point.x >= bounds.x &&
         point.x <= bounds.x + bounds.width &&
         point.y >= bounds.y &&
         point.y <= bounds.y + bounds.height;
}
```

## 4. Column

### 4.1 职责

- 存储字段的元数据
- 提供类型信息
- 管理约束属性

### 4.2 接口设计

```typescript
class Column {
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
  
  // 序列化
  toJSON(): object;
  static fromJSON(json: any): Column;
  static create(name: string, type: string): Column;
  
  // 验证
  validate(): ValidationResult;
  
  // 工具方法
  getDisplayType(): string;
  isNumeric(): boolean;
  isString(): boolean;
  isDate(): boolean;
}
```

### 4.3 类型系统

```typescript
// 数据类型映射
const TYPE_CATEGORIES = {
  numeric: ['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 
            'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'NUMBER'],
  string: ['VARCHAR', 'CHAR', 'TEXT', 'STRING', 'CLOB'],
  date: ['DATE', 'DATETIME', 'TIMESTAMP', 'TIME'],
  binary: ['BLOB', 'BINARY', 'VARBINARY'],
  boolean: ['BOOLEAN', 'BOOL'],
  json: ['JSON', 'JSONB']
};

isNumeric(): boolean {
  const baseType = this.type.split('(')[0].toUpperCase();
  return TYPE_CATEGORIES.numeric.includes(baseType);
}

getDisplayType(): string {
  // 简化显示长类型
  if (this.type.length > 20) {
    return this.type.substring(0, 17) + '...';
  }
  return this.type;
}
```

### 4.4 验证规则

```typescript
validate(): ValidationResult {
  const errors: ValidationError[] = [];
  
  // 检查名称
  if (!this.name || this.name.trim() === '') {
    errors.push({
      type: 'error',
      message: 'Column name cannot be empty'
    });
  }
  
  // 检查类型
  if (!this.type || this.type.trim() === '') {
    errors.push({
      type: 'error',
      message: 'Column type cannot be empty'
    });
  }
  
  // 检查主键约束
  if (this.primaryKey && this.nullable) {
    errors.push({
      type: 'error',
      message: 'Primary key column cannot be nullable'
    });
  }
  
  // 检查自增约束
  if (this.autoIncrement && !this.isNumeric()) {
    errors.push({
      type: 'error',
      message: 'Auto increment can only be applied to numeric columns'
    });
  }
  
  return {
    valid: errors.filter(e => e.type === 'error').length === 0,
    errors
  };
}
```

## 5. Relationship

### 5.1 关系类型

```typescript
type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-many';

type CascadeAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
```

### 5.2 接口设计

```typescript
class Relationship {
  id: string;
  type: RelationType;
  sourceTableId: string;
  targetTableId: string;
  sourceColumnId: string;
  targetColumnId: string;
  onDelete?: CascadeAction;
  onUpdate?: CascadeAction;
  name?: string; // 约束名称
  
  constructor(
    id: string,
    type: RelationType,
    sourceTableId: string,
    targetTableId: string,
    sourceColumnId: string,
    targetColumnId: string
  );
  
  // 序列化
  toJSON(): object;
  static fromJSON(json: any): Relationship;
  static create(
    type: RelationType,
    sourceTable: Table,
    targetTable: Table,
    sourceColumn: Column,
    targetColumn: Column
  ): Relationship;
  
  // 验证
  validate(schema: Schema): ValidationResult;
  
  // 工具方法
  getSourceTable(schema: Schema): Table | undefined;
  getTargetTable(schema: Schema): Table | undefined;
  getSourceColumn(schema: Schema): Column | undefined;
  getTargetColumn(schema: Schema): Column | undefined;
}
```

### 5.3 工厂方法

```typescript
static create(
  type: RelationType,
  sourceTable: Table,
  targetTable: Table,
  sourceColumn: Column,
  targetColumn: Column
): Relationship {
  const rel = new Relationship(
    generateId(),
    type,
    sourceTable.id,
    targetTable.id,
    sourceColumn.id,
    targetColumn.id
  );
  
  // 生成约束名称
  rel.name = `fk_${sourceTable.name}_${targetTable.name}`;
  
  // 设置默认级联操作
  rel.onDelete = 'RESTRICT';
  rel.onUpdate = 'CASCADE';
  
  return rel;
}
```

### 5.3 验证规则

```typescript
validate(schema: Schema): ValidationResult {
  const errors: ValidationError[] = [];
  
  // 检查表存在性
  const sourceTable = schema.getTable(this.sourceTableId);
  const targetTable = schema.getTable(this.targetTableId);
  
  if (!sourceTable) {
    errors.push({
      type: 'error',
      message: 'Source table not found'
    });
  }
  
  if (!targetTable) {
    errors.push({
      type: 'error',
      message: 'Target table not found'
    });
  }
  
  // 检查字段存在性
  if (sourceTable) {
    const sourceColumn = sourceTable.getColumn(this.sourceColumnId);
    if (!sourceColumn) {
      errors.push({
        type: 'error',
        message: 'Source column not found'
      });
    }
  }
  
  if (targetTable) {
    const targetColumn = targetTable.getColumn(this.targetColumnId);
    if (!targetColumn) {
      errors.push({
        type: 'error',
        message: 'Target column not found'
      });
    }
    
    // 检查目标字段是否为主键
    if (targetColumn && !targetColumn.primaryKey) {
      errors.push({
        type: 'warning',
        message: 'Target column should be a primary key'
      });
    }
  }
  
  // 检查类型兼容性
  if (sourceTable && targetTable) {
    const sourceColumn = sourceTable.getColumn(this.sourceColumnId);
    const targetColumn = targetTable.getColumn(this.targetColumnId);
    
    if (sourceColumn && targetColumn) {
      if (sourceColumn.type !== targetColumn.type) {
        errors.push({
          type: 'warning',
          message: 'Column types do not match'
        });
      }
    }
  }
  
  return {
    valid: errors.filter(e => e.type === 'error').length === 0,
    errors
  };
}
```

## 6. 序列化

### 6.1 JSON 格式

```json
{
  "name": "My Database",
  "metadata": {
    "version": "1.0",
    "created": "2026-02-16T10:00:00Z",
    "modified": "2026-02-16T12:00:00Z"
  },
  "tables": [
    {
      "id": "table-1",
      "name": "users",
      "position": { "x": 100, "y": 100 },
      "columns": [
        {
          "id": "col-1",
          "name": "id",
          "type": "INT",
          "nullable": false,
          "primaryKey": true,
          "autoIncrement": true
        },
        {
          "id": "col-2",
          "name": "username",
          "type": "VARCHAR(50)",
          "nullable": false,
          "unique": true
        }
      ],
      "indexes": [
        {
          "name": "idx_username",
          "columns": ["username"],
          "unique": true
        }
      ],
      "constraints": []
    }
  ],
  "relationships": [
    {
      "id": "rel-1",
      "type": "one-to-many",
      "sourceTableId": "table-2",
      "targetTableId": "table-1",
      "sourceColumnId": "col-5",
      "targetColumnId": "col-1",
      "onDelete": "CASCADE",
      "onUpdate": "CASCADE"
    }
  ]
}
```

### 6.2 序列化实现

```typescript
toJSON(): object {
  return {
    name: this.name,
    metadata: {
      ...this.metadata,
      version: '1.0',
      modified: new Date().toISOString()
    },
    tables: Array.from(this.tables.values()).map(t => t.toJSON()),
    relationships: Array.from(this.relationships.values()).map(r => r.toJSON())
  };
}
```

### 6.3 反序列化实现

```typescript
static fromJSON(json: any): Schema {
  const schema = new Schema();
  schema.name = json.name || 'Untitled Schema';
  schema.metadata = json.metadata || {};
  
  // 先加载所有表
  for (const tableData of json.tables || []) {
    try {
      const table = Table.fromJSON(tableData);
      schema.addTable(table);
    } catch (error) {
      console.error('Failed to load table:', error);
    }
  }
  
  // 再加载关系（依赖表已存在）
  for (const relData of json.relationships || []) {
    try {
      const rel = Relationship.fromJSON(relData);
      
      // 验证关系的完整性
      const validation = rel.validate(schema);
      if (validation.valid) {
        schema.addRelationship(rel);
      } else {
        console.warn('Invalid relationship skipped:', validation.errors);
      }
    } catch (error) {
      console.error('Failed to load relationship:', error);
    }
  }
  
  return schema;
}
```

## 7. ID 生成

### 7.1 生成策略

```typescript
export function generateId(): string {
  // 时间戳 + 随机数
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
}

// 示例输出: "lm3k5p2-a7b9c4d"
```

### 7.2 优点

- 简单高效
- 无需外部依赖
- 时间排序
- 碰撞概率极低

### 7.3 替代方案

**UUID v4**：
```typescript
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

**Snowflake ID**：
```typescript
class SnowflakeIdGenerator {
  private sequence: number = 0;
  private lastTimestamp: number = -1;
  
  generate(): string {
    let timestamp = Date.now();
    
    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & 0xFFF;
      if (this.sequence === 0) {
        timestamp = this.waitNextMillis(timestamp);
      }
    } else {
      this.sequence = 0;
    }
    
    this.lastTimestamp = timestamp;
    
    return `${timestamp}${this.sequence.toString().padStart(4, '0')}`;
  }
  
  private waitNextMillis(lastTimestamp: number): number {
    let timestamp = Date.now();
    while (timestamp <= lastTimestamp) {
      timestamp = Date.now();
    }
    return timestamp;
  }
}
```

## 8. 数据迁移

### 8.1 版本管理

```typescript
interface SchemaVersion {
  version: string;
  migrate: (data: any) => any;
}

const migrations: SchemaVersion[] = [
  {
    version: '1.0',
    migrate: (data: any) => data // 初始版本
  },
  {
    version: '1.1',
    migrate: (data: any) => {
      // 添加 metadata 字段
      if (!data.metadata) {
        data.metadata = {};
      }
      return data;
    }
  },
  {
    version: '1.2',
    migrate: (data: any) => {
      // 添加 indexes 字段到表
      for (const table of data.tables || []) {
        if (!table.indexes) {
          table.indexes = [];
        }
      }
      return data;
    }
  }
];

function migrateSchema(data: any, targetVersion: string): any {
  const currentVersion = data.metadata?.version || '1.0';
  
  for (const migration of migrations) {
    if (migration.version > currentVersion && 
        migration.version <= targetVersion) {
      data = migration.migrate(data);
      data.metadata.version = migration.version;
    }
  }
  
  return data;
}
```

## 9. 性能优化

### 9.1 使用 Map 而非数组

```typescript
// ❌ 慢：O(n) 查找
tables: Table[] = [];
getTable(id: string): Table | undefined {
  return this.tables.find(t => t.id === id);
}

// ✅ 快：O(1) 查找
tables: Map<string, Table> = new Map();
getTable(id: string): Table | undefined {
  return this.tables.get(id);
}
```

### 9.2 缓存计算结果

```typescript
class Table {
  private _bounds: Rect | null = null;
  
  getBounds(): Rect {
    if (!this._bounds) {
      this._bounds = this.calculateBounds();
    }
    return this._bounds;
  }
  
  invalidateBounds(): void {
    this._bounds = null;
  }
  
  addColumn(column: Column): void {
    this.columns.push(column);
    this.invalidateBounds(); // 清除缓存
  }
}
```

### 9.3 延迟加载

```typescript
class Schema {
  private _validationResult: ValidationResult | null = null;
  
  validate(force: boolean = false): ValidationResult {
    if (!this._validationResult || force) {
      this._validationResult = this.performValidation();
    }
    return this._validationResult;
  }
  
  invalidateValidation(): void {
    this._validationResult = null;
  }
}
```
