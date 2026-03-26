// Safe SQL identifier validation.
// Only validates identifier names (schema, table, procedure) — never user values.
// User values must always be passed as mssql parameters, never interpolated.

const SAFE_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_$#@]{0,127}$/;

export function isValidIdentifier(name: string): boolean {
  return SAFE_IDENTIFIER_RE.test(name);
}

export function validateIdentifier(name: string, label: string): string {
  if (!isValidIdentifier(name)) {
    throw new Error(
      `Invalid ${label} "${name}". Identifiers must start with a letter or underscore and contain only letters, digits, underscores, $, #, @.`
    );
  }
  return name;
}

export function bracketIdentifier(name: string): string {
  validateIdentifier(name, "identifier");
  return `[${name}]`;
}

// ORDER BY: allows column names (optionally bracketed), dotted refs, ASC/DESC
const ORDER_BY_RE =
  /^(\[?[a-zA-Z_][a-zA-Z0-9_$#@.]*\]?(\s+(ASC|DESC))?)((\s*,\s*)\[?[a-zA-Z_][a-zA-Z0-9_$#@.]*\]?(\s+(ASC|DESC))?)*$/i;

export function validateOrderBy(orderBy: string): string {
  if (!ORDER_BY_RE.test(orderBy.trim())) {
    throw new Error(
      "Invalid ORDER BY clause. Only column names, commas, and ASC/DESC direction keywords are allowed."
    );
  }
  return orderBy.trim();
}
