import { bracketIdentifier } from "./validators.js";

export function buildSelectQuery(
  schemaName: string,
  tableName: string,
  columns: string[] | null,
  orderBy: string | null,
  offset: number,
  limit: number
): string {
  const safeSchema = bracketIdentifier(schemaName);
  const safeTable = bracketIdentifier(tableName);
  const projection =
    columns && columns.length > 0 ? columns.map(bracketIdentifier).join(", ") : "*";
  const order = orderBy ?? "(SELECT NULL)";
  return (
    `SELECT ${projection} FROM ${safeSchema}.${safeTable}` +
    ` ORDER BY ${order}` +
    ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`
  );
}

export function buildSelectWithWhereQuery(
  schemaName: string,
  tableName: string,
  columns: string[] | null,
  whereClause: string,
  orderBy: string | null,
  offset: number,
  limit: number
): string {
  const safeSchema = bracketIdentifier(schemaName);
  const safeTable = bracketIdentifier(tableName);
  const projection =
    columns && columns.length > 0 ? columns.map(bracketIdentifier).join(", ") : "*";
  const order = orderBy ?? "(SELECT NULL)";
  return (
    `SELECT ${projection} FROM ${safeSchema}.${safeTable}` +
    ` WHERE ${whereClause}` +
    ` ORDER BY ${order}` +
    ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`
  );
}

export function buildSchemaObjectsQuery(
  objectType: "tables" | "views" | "procedures" | "functions" | "all",
  schemaName?: string
): string {
  const parts: string[] = [];
  const schemaFilter = schemaName ? "TABLE_SCHEMA = @schemaName" : null;
  const routineSchemaFilter = schemaName ? "ROUTINE_SCHEMA = @schemaName" : null;

  if (objectType === "tables" || objectType === "all") {
    parts.push(`
      SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE, 'table' as OBJECT_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      ${schemaFilter ? `WHERE ${schemaFilter}` : ""}
    `);
  }
  if (objectType === "views" || objectType === "all") {
    parts.push(`
      SELECT TABLE_SCHEMA, TABLE_NAME, 'VIEW' as TABLE_TYPE, 'view' as OBJECT_TYPE
      FROM INFORMATION_SCHEMA.VIEWS
      ${schemaFilter ? `WHERE ${schemaFilter}` : ""}
    `);
  }
  if (objectType === "procedures" || objectType === "all") {
    parts.push(`
      SELECT ROUTINE_SCHEMA as TABLE_SCHEMA, ROUTINE_NAME as TABLE_NAME,
             'PROCEDURE' as TABLE_TYPE, 'procedure' as OBJECT_TYPE
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'PROCEDURE'
      ${routineSchemaFilter ? `AND ${routineSchemaFilter}` : ""}
    `);
  }
  if (objectType === "functions" || objectType === "all") {
    parts.push(`
      SELECT ROUTINE_SCHEMA as TABLE_SCHEMA, ROUTINE_NAME as TABLE_NAME,
             'FUNCTION' as TABLE_TYPE, 'function' as OBJECT_TYPE
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'FUNCTION'
      ${routineSchemaFilter ? `AND ${routineSchemaFilter}` : ""}
    `);
  }

  return parts.join(" UNION ALL ") + " ORDER BY TABLE_SCHEMA, TABLE_NAME";
}
