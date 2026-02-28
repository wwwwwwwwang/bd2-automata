import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECK_SEVERITY = {
  BLOCKER: 'blocker',
  WARNING: 'warning',
};

const CREATE_TABLE_STATEMENT_REGEX = /CREATE TABLE\s+`([^`]+)`\s*\(([\s\S]*?)\);/g;
const CREATE_INDEX_STATEMENT_REGEX = /CREATE\s+(UNIQUE\s+)?INDEX\s+`([^`]+)`\s+ON\s+`([^`]+)`\s*\(([^)]+)\)/g;
const COLUMN_CONSTRAINT_KEYWORDS = [
  'NOT NULL',
  'PRIMARY KEY',
  'UNIQUE',
  'CHECK',
  'COLLATE',
  'REFERENCES',
  'CONSTRAINT',
  'GENERATED',
];

function uniqSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDefaultValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  const trimmed = normalizeWhitespace(value);
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed === 'true') return 'true';
  if (trimmed === 'false') return 'false';
  return trimmed;
}

function stableSortObject(value) {
  if (Array.isArray(value)) {
    return value.map(stableSortObject);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce((result, key) => {
        result[key] = stableSortObject(value[key]);
        return result;
      }, {});
  }

  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableSortObject(value));
}

function createCheck({ id, severity, ok, evidence = [], diff = {}, recommendation }) {
  return {
    id,
    severity,
    ok,
    evidence: [...evidence].sort((left, right) => left.localeCompare(right)),
    diff: stableSortObject(diff),
    recommendation,
  };
}

function splitTopLevel(source, delimiter = ',') {
  const chunks = [];
  let current = '';
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let quote = null;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const previous = source[i - 1];

    if (quote) {
      current += char;
      if (char === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      current += char;
      continue;
    }

    if (char === '(') depthParen += 1;
    if (char === ')') depthParen -= 1;
    if (char === '{') depthBrace += 1;
    if (char === '}') depthBrace -= 1;
    if (char === '[') depthBracket += 1;
    if (char === ']') depthBracket -= 1;

    if (char === delimiter && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
      if (current.trim()) {
        chunks.push(current.trim());
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

function findMatchingPair(source, startIndex, openChar, closeChar) {
  let depth = 0;
  let quote = null;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];

    if (quote) {
      if (char === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === openChar) {
      depth += 1;
      continue;
    }

    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function findMatchingBrace(source, startIndex) {
  return findMatchingPair(source, startIndex, '{', '}');
}

function extractDefaultValueFromSuffix(suffix) {
  const defaultIndex = suffix.search(/\bDEFAULT\b/i);
  if (defaultIndex === -1) {
    return null;
  }

  const source = suffix.slice(defaultIndex + 'DEFAULT'.length).trimStart();
  if (!source) {
    return null;
  }

  let quote = null;
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];

    if (quote) {
      if (char === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(') {
      depthParen += 1;
      continue;
    }

    if (char === ')') {
      depthParen = Math.max(0, depthParen - 1);
      continue;
    }

    if (char === '{') {
      depthBrace += 1;
      continue;
    }

    if (char === '}') {
      depthBrace = Math.max(0, depthBrace - 1);
      continue;
    }

    if (char === '[') {
      depthBracket += 1;
      continue;
    }

    if (char === ']') {
      depthBracket = Math.max(0, depthBracket - 1);
      continue;
    }

    if (depthParen !== 0 || depthBrace !== 0 || depthBracket !== 0) {
      continue;
    }

    if (char === ',' || char === ';') {
      return source.slice(0, index).trim();
    }

    if (/\s/.test(char)) {
      const remaining = source.slice(index + 1).trimStart();
      if (remaining.length === 0) {
        return source.slice(0, index).trim();
      }

      const upperRemaining = remaining.toUpperCase();
      if (COLUMN_CONSTRAINT_KEYWORDS.some((keyword) => upperRemaining.startsWith(keyword))) {
        return source.slice(0, index).trim();
      }
    }
  }

  return source.trim();
}

function findMatchingParenthesis(source, openParenIndex) {
  return findMatchingPair(source, openParenIndex, '(', ')');
}

function findSqlTypeEnd(expression, startIndex = 0) {
  let quote = null;
  let depthParen = 0;

  for (let index = startIndex; index < expression.length; index += 1) {
    const char = expression[index];
    const previous = expression[index - 1];

    if (quote) {
      if (char === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(') {
      depthParen += 1;
      continue;
    }

    if (char === ')') {
      depthParen = Math.max(0, depthParen - 1);
      continue;
    }

    if (depthParen === 0 && /\s/.test(char)) {
      return index;
    }
  }

  return expression.length;
}

function extractTableCallbackObjectSource(content, columnsEnd) {
  const afterColumns = content.slice(columnsEnd + 1);
  const callbackStartMatch = /^\s*,\s*(?:\([^)]+\)|[A-Za-z0-9_]+)\s*=>\s*/m.exec(afterColumns);
  if (!callbackStartMatch) {
    return '';
  }

  const callbackBodyStart = columnsEnd + 1 + callbackStartMatch[0].length;
  const afterCallbackBody = content.slice(callbackBodyStart);
  const trimmedBody = afterCallbackBody.trimStart();
  if (!trimmedBody) {
    return '';
  }

  const bodyStart = callbackBodyStart + (afterCallbackBody.length - trimmedBody.length);
  const firstChar = content[bodyStart];

  if (firstChar === '(') {
    const objectStart = content.indexOf('{', bodyStart);
    if (objectStart === -1) {
      return '';
    }

    const objectEnd = findMatchingBrace(content, objectStart);
    if (objectEnd === -1) {
      return '';
    }

    return content.slice(objectStart + 1, objectEnd);
  }

  if (firstChar === '{') {
    const blockStart = bodyStart;
    const blockEnd = findMatchingBrace(content, blockStart);
    if (blockEnd === -1) {
      return '';
    }

    const blockContent = content.slice(blockStart + 1, blockEnd);
    const returnObjectMatch = /return\s*\{/m.exec(blockContent);
    if (!returnObjectMatch) {
      return '';
    }

    const objectStartInBlock = returnObjectMatch.index + returnObjectMatch[0].lastIndexOf('{');
    const objectStart = blockStart + 1 + objectStartInBlock;
    const objectEnd = findMatchingBrace(content, objectStart);
    if (objectEnd === -1 || objectEnd > blockEnd) {
      return '';
    }

    return content.slice(objectStart + 1, objectEnd);
  }

  return '';
}

function parseSqlStructure(sqlText) {
  const tables = {};

  for (const match of sqlText.matchAll(CREATE_TABLE_STATEMENT_REGEX)) {
    const tableName = match[1];
    const body = match[2];
    const lines = splitTopLevel(body, '\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/,$/, ''));

    const columns = [];
    const foreignKeys = [];

    for (const line of lines) {
      if (line.startsWith('`')) {
        const columnMatch = /^`([^`]+)`\s+(.+)$/i.exec(line);
        if (!columnMatch) continue;

        const columnName = columnMatch[1];
        const expression = columnMatch[2];
        const typeEnd = findSqlTypeEnd(expression);
        const columnType = normalizeWhitespace(expression.slice(0, typeEnd)).toLowerCase();
        const suffix = expression.slice(typeEnd).trimStart();

        columns.push({
          name: columnName,
          type: columnType,
          default: normalizeDefaultValue(extractDefaultValueFromSuffix(suffix)),
          notNull: /\bNOT\s+NULL\b/i.test(suffix),
          primaryKey: /\bPRIMARY\s+KEY\b/i.test(suffix),
        });
        continue;
      }

      if (/^(?:CONSTRAINT\s+`?[^`\s]+`?\s+)?FOREIGN\s+KEY\b/i.test(line)) {
        const fkMatch = /(?:CONSTRAINT\s+`?[^`\s]+`?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s*`([^`]+)`\s*\(([^)]+)\)(?:\s+ON\s+UPDATE\s+([^\s]+(?:\s+[^\s]+)?))?(?:\s+ON\s+DELETE\s+([^\s]+(?:\s+[^\s]+)?))?/i.exec(
          line
        );

        if (!fkMatch) continue;

        const columnsFrom = fkMatch[1]
          .split(',')
          .map((item) => item.replace(/[\s`]/g, '').trim())
          .filter(Boolean);

        const columnsTo = fkMatch[3]
          .split(',')
          .map((item) => item.replace(/[\s`]/g, '').trim())
          .filter(Boolean);

        foreignKeys.push({
          tableTo: fkMatch[2],
          columnsFrom,
          columnsTo,
          onUpdate: normalizeDefaultValue(fkMatch[4] ?? 'no action'),
          onDelete: normalizeDefaultValue(fkMatch[5] ?? 'no action'),
        });
      }
    }

    tables[tableName] = {
      columns: columns.sort((left, right) => left.name.localeCompare(right.name)),
      foreignKeys: foreignKeys.sort((left, right) => stableStringify(left).localeCompare(stableStringify(right))),
      indexes: [],
    };
  }

  for (const match of sqlText.matchAll(CREATE_INDEX_STATEMENT_REGEX)) {
    const isUnique = Boolean(match[1]);
    const indexName = match[2];
    const tableName = match[3];
    const columns = match[4]
      .split(',')
      .map((column) => column.replace(/[\s`]/g, '').trim())
      .filter(Boolean);

    if (!tables[tableName]) {
      tables[tableName] = { columns: [], foreignKeys: [], indexes: [] };
    }

    tables[tableName].indexes.push({ name: indexName, unique: isUnique, columns });
  }

  for (const tableName of Object.keys(tables)) {
    tables[tableName].indexes = tables[tableName].indexes.sort((left, right) =>
      left.name.localeCompare(right.name)
    );
  }

  return tables;
}

function extractSchemaTableDefinitions(schemaFileContents) {
  const definitions = [];

  for (const content of schemaFileContents) {
    let cursor = 0;

    while (cursor < content.length) {
      const exportIndex = content.indexOf('export const ', cursor);
      if (exportIndex === -1) break;

      const headerMatch = /export const\s+([A-Za-z0-9_]+)\s*=\s*sqliteTable\(\s*(["'`])([^"'`]+)\2/g;
      headerMatch.lastIndex = exportIndex;
      const matched = headerMatch.exec(content);

      if (!matched || matched.index !== exportIndex) {
        cursor = exportIndex + 1;
        continue;
      }

      const symbol = matched[1];
      const tableName = matched[3];
      const afterHeaderIndex = headerMatch.lastIndex;
      const columnsStart = content.indexOf('{', afterHeaderIndex);
      if (columnsStart === -1) {
        cursor = afterHeaderIndex;
        continue;
      }

      const columnsEnd = findMatchingBrace(content, columnsStart);
      if (columnsEnd === -1) {
        cursor = columnsStart + 1;
        continue;
      }

      const columnsSource = content.slice(columnsStart + 1, columnsEnd);
      const indexesSource = extractTableCallbackObjectSource(content, columnsEnd);

      definitions.push({ symbol, tableName, columnsSource, indexesSource });
      cursor = columnsEnd + 1;
    }
  }

  return definitions;
}

function resolveSchemaColumnFromToken(token, columnsByProperty) {
  const trimmed = token.trim();
  const tablePropertyMatch = /table\.([A-Za-z0-9_]+)/.exec(trimmed);
  if (tablePropertyMatch) {
    return columnsByProperty[tablePropertyMatch[1]] ?? tablePropertyMatch[1];
  }

  const quotedNameMatch = /^["'`]([^"'`]+)["'`]$/.exec(trimmed);
  if (quotedNameMatch) {
    return quotedNameMatch[1];
  }

  return trimmed.replace(/[\s`"']/g, '');
}

function resolveSchemaForeignReference(token, context) {
  const trimmed = token.trim();
  const symbolPropertyMatch = /^([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)$/.exec(trimmed);
  if (symbolPropertyMatch) {
    const symbol = symbolPropertyMatch[1];
    const property = symbolPropertyMatch[2];

    if (symbol === 'table') {
      return {
        tableTo: context.currentTableName,
        columnName: context.currentColumnsByProperty[property] ?? property,
      };
    }

    if (context.symbolToTable[symbol]) {
      const targetColumnsByProperty = context.symbolToColumnsByProperty[symbol] ?? {};
      return {
        tableTo: context.symbolToTable[symbol],
        columnName: targetColumnsByProperty[property] ?? property,
      };
    }
  }

  const quotedNameMatch = /^["'`]([^"'`]+)["'`]$/.exec(trimmed);
  if (quotedNameMatch) {
    return {
      tableTo: context.currentTableName,
      columnName: quotedNameMatch[1],
    };
  }

  const raw = trimmed.replace(/[\s`"']/g, '');
  if (raw.length === 0) {
    return null;
  }

  return {
    tableTo: context.currentTableName,
    columnName: raw,
  };
}

function extractDefaultFromSchemaExpression(expression) {
  const defaultIndex = expression.search(/\.default\s*\(/i);
  if (defaultIndex === -1) {
    return null;
  }

  const openParenIndex = expression.indexOf('(', defaultIndex);
  if (openParenIndex === -1) {
    return null;
  }

  const closeParenIndex = findMatchingParenthesis(expression, openParenIndex);
  if (closeParenIndex === -1) {
    return null;
  }

  const argument = expression.slice(openParenIndex + 1, closeParenIndex).trim();
  if (!argument) {
    return null;
  }

  const sqlDefaultMatch = /^sql`([\s\S]+)`$/m.exec(argument);
  if (sqlDefaultMatch) {
    return sqlDefaultMatch[1];
  }

  return argument;
}

function parseSchemaStructure(schemaFileContents) {
  const definitions = extractSchemaTableDefinitions(schemaFileContents);
  const symbolToTable = Object.fromEntries(definitions.map((item) => [item.symbol, item.tableName]));

  const symbolToColumnsByProperty = {};
  for (const definition of definitions) {
    const columnsByProperty = {};

    for (const entry of splitTopLevel(definition.columnsSource)) {
      const separatorIndex = entry.indexOf(':');
      if (separatorIndex === -1) continue;

      const propertyName = entry.slice(0, separatorIndex).trim();
      const expression = entry.slice(separatorIndex + 1).trim();
      if (!propertyName || !expression) continue;

      const constructorMatch = /^([A-Za-z0-9_]+)\s*\(\s*(["'`])([^"'`]+)\2/m.exec(expression);
      if (!constructorMatch) continue;

      columnsByProperty[propertyName] = constructorMatch[3];
    }

    symbolToColumnsByProperty[definition.symbol] = columnsByProperty;
  }

  const tables = {};

  for (const definition of definitions) {
    const columns = [];
    const columnsByProperty = symbolToColumnsByProperty[definition.symbol] ?? {};
    const foreignKeys = [];
    const indexes = [];
    const indexKeys = new Set();

    const appendIndex = (index) => {
      const key = stableStringify(index);
      if (indexKeys.has(key)) {
        return;
      }
      indexKeys.add(key);
      indexes.push(index);
    };

    for (const entry of splitTopLevel(definition.columnsSource)) {
      const separatorIndex = entry.indexOf(':');
      if (separatorIndex === -1) continue;

      const propertyName = entry.slice(0, separatorIndex).trim();
      const expression = entry.slice(separatorIndex + 1).trim();
      if (!propertyName || !expression) continue;

      const constructorMatch = /^([A-Za-z0-9_]+)\s*\(\s*(["'`])([^"'`]+)\2/m.exec(expression);
      if (!constructorMatch) continue;

      const constructorType = constructorMatch[1].toLowerCase();
      const columnName = constructorMatch[3];

      const defaultRaw = extractDefaultFromSchemaExpression(expression);

      const referenceMatch = /\.references\(\s*\(\)\s*=>\s*([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)(?:\s*,\s*\{([\s\S]*?)\})?\s*\)/m.exec(
        expression
      );

      if (referenceMatch) {
        const optionSource = referenceMatch[3] ?? '';
        const onDeleteMatch = /onDelete\s*:\s*'([^']+)'/m.exec(optionSource);
        const onUpdateMatch = /onUpdate\s*:\s*'([^']+)'/m.exec(optionSource);
        const targetColumnsByProperty = symbolToColumnsByProperty[referenceMatch[1]] ?? {};

        foreignKeys.push({
          tableTo: symbolToTable[referenceMatch[1]] ?? referenceMatch[1],
          columnsFrom: [columnName],
          columnsTo: [targetColumnsByProperty[referenceMatch[2]] ?? referenceMatch[2]],
          onUpdate: normalizeDefaultValue(onUpdateMatch?.[1] ?? 'no action'),
          onDelete: normalizeDefaultValue(onDeleteMatch?.[1] ?? 'no action'),
        });
      }

      const explicitUniqueNameMatch = /\.unique\(\s*["'`]([^"'`]+)["'`]\s*\)/m.exec(expression);
      if (/\.unique\(/.test(expression)) {
        appendIndex({
          name: explicitUniqueNameMatch?.[1] ?? `${definition.tableName}_${columnName}_unique`,
          unique: true,
          columns: [columnName],
        });
      }

      const primaryKey = /\.primaryKey\(/.test(expression) || /\.primaryKey\(\)/.test(expression);
      columns.push({
        name: columnName,
        type: constructorType,
        default: normalizeDefaultValue(defaultRaw),
        notNull: /\.notNull\(\)/.test(expression) || primaryKey,
        primaryKey,
      });
    }

    if (definition.indexesSource) {
      for (const entry of splitTopLevel(definition.indexesSource)) {
        const indexMatch = /(uniqueIndex|index)\(\s*(["'`])([^"'`]+)\2\s*\)\.on\(([^)]*)\)/m.exec(entry);
        if (indexMatch) {
          const indexColumns = splitTopLevel(indexMatch[4])
            .map((piece) => resolveSchemaColumnFromToken(piece, columnsByProperty))
            .filter(Boolean);

          appendIndex({
            name: indexMatch[3],
            unique: indexMatch[1] === 'uniqueIndex',
            columns: indexColumns,
          });
          continue;
        }

        const foreignKeyMatch = /foreignKey\(\s*\{([\s\S]*?)\}\s*\)/m.exec(entry);
        if (!foreignKeyMatch) {
          continue;
        }

        const foreignKeyConfig = foreignKeyMatch[1];
        const fromColumnsMatch = /columns\s*:\s*\[([\s\S]*?)\]/m.exec(foreignKeyConfig);
        const toColumnsMatch = /foreignColumns\s*:\s*\[([\s\S]*?)\]/m.exec(foreignKeyConfig);

        const columnsFrom = (fromColumnsMatch ? splitTopLevel(fromColumnsMatch[1]) : [])
          .map((piece) => resolveSchemaColumnFromToken(piece, columnsByProperty))
          .filter(Boolean);

        const foreignReferenceContext = {
          symbolToTable,
          symbolToColumnsByProperty,
          currentTableName: definition.tableName,
          currentColumnsByProperty: columnsByProperty,
        };

        const resolvedColumnsTo = (toColumnsMatch ? splitTopLevel(toColumnsMatch[1]) : [])
          .map((piece) => resolveSchemaForeignReference(piece, foreignReferenceContext))
          .filter(Boolean);

        const tableCandidates = uniqSorted(resolvedColumnsTo.map((item) => item.tableTo));
        if (columnsFrom.length === 0 || resolvedColumnsTo.length === 0 || tableCandidates.length !== 1) {
          continue;
        }

        const columnsTo = resolvedColumnsTo.map((item) => item.columnName);
        const tableTo = tableCandidates[0];

        const onDeleteMatch = /\.onDelete\(\s*['"]([^'"]+)['"]\s*\)/m.exec(entry);
        const onUpdateMatch = /\.onUpdate\(\s*['"]([^'"]+)['"]\s*\)/m.exec(entry);

        foreignKeys.push({
          tableTo,
          columnsFrom,
          columnsTo,
          onUpdate: normalizeDefaultValue(onUpdateMatch?.[1] ?? 'no action'),
          onDelete: normalizeDefaultValue(onDeleteMatch?.[1] ?? 'no action'),
        });
      }
    }

    tables[definition.tableName] = {
      columns: columns.sort((left, right) => left.name.localeCompare(right.name)),
      foreignKeys: foreignKeys.sort((left, right) => stableStringify(left).localeCompare(stableStringify(right))),
      indexes: indexes.sort((left, right) => left.name.localeCompare(right.name)),
    };
  }

  return tables;
}

function parseSnapshotStructure(snapshotText) {
  const snapshot = JSON.parse(snapshotText);
  const tables = {};

  for (const [tableName, tableValue] of Object.entries(snapshot.tables ?? {})) {
    const columns = Object.values(tableValue.columns ?? {})
      .map((column) => ({
        name: column.name,
        type: normalizeWhitespace(column.type).toLowerCase(),
        default: normalizeDefaultValue(column.default ?? null),
        notNull: Boolean(column.notNull),
        primaryKey: Boolean(column.primaryKey),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    const foreignKeys = Object.values(tableValue.foreignKeys ?? {})
      .map((foreignKey) => ({
        tableTo: foreignKey.tableTo,
        columnsFrom: [...(foreignKey.columnsFrom ?? [])],
        columnsTo: [...(foreignKey.columnsTo ?? [])],
        onUpdate: normalizeDefaultValue(foreignKey.onUpdate ?? 'no action'),
        onDelete: normalizeDefaultValue(foreignKey.onDelete ?? 'no action'),
      }))
      .sort((left, right) => stableStringify(left).localeCompare(stableStringify(right)));

    const indexes = Object.values(tableValue.indexes ?? {})
      .map((index) => ({
        name: index.name,
        unique: Boolean(index.isUnique),
        columns: [...(index.columns ?? [])],
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    tables[tableName] = { columns, foreignKeys, indexes };
  }

  return tables;
}

function compareTableStructures(leftTables, rightTables, leftName, rightName) {
  const leftKeys = Object.keys(leftTables).sort((a, b) => a.localeCompare(b));
  const rightKeys = Object.keys(rightTables).sort((a, b) => a.localeCompare(b));

  const leftSet = new Set(leftKeys);
  const rightSet = new Set(rightKeys);

  const onlyInLeft = leftKeys.filter((key) => !rightSet.has(key));
  const onlyInRight = rightKeys.filter((key) => !leftSet.has(key));

  const changedTables = leftKeys
    .filter((tableName) => rightSet.has(tableName))
    .filter((tableName) => stableStringify(leftTables[tableName]) !== stableStringify(rightTables[tableName]))
    .sort((a, b) => a.localeCompare(b));

  return {
    ok: onlyInLeft.length === 0 && onlyInRight.length === 0 && changedTables.length === 0,
    diff: {
      [`${leftName}Only`]: onlyInLeft,
      [`${rightName}Only`]: onlyInRight,
      changedTables,
    },
  };
}

function buildStructuralDiff(sqlTables, schemaTables, snapshotTables) {
  const sqlVsSchema = compareTableStructures(sqlTables, schemaTables, 'sql', 'schema');
  const sqlVsSnapshot = compareTableStructures(sqlTables, snapshotTables, 'sql', 'snapshot');
  const schemaVsSnapshot = compareTableStructures(schemaTables, snapshotTables, 'schema', 'snapshot');

  return {
    ok: sqlVsSchema.ok && sqlVsSnapshot.ok && schemaVsSnapshot.ok,
    diff: {
      sqlVsSchema: sqlVsSchema.diff,
      sqlVsSnapshot: sqlVsSnapshot.diff,
      schemaVsSnapshot: schemaVsSnapshot.diff,
    },
  };
}

function normalizeScriptCommandForEvidence(command) {
  return String(command ?? '')
    .replace(/([A-Za-z_][A-Za-z0-9_]*(?:TOKEN|KEY|SECRET|PASSWORD|PASS|PWD))\s*=\s*[^\s&|;]+/gi, '$1=<redacted>')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1<redacted>')
    .replace(/(https?:\/\/[^\s:@\/]+:)[^\s@\/]+@/gi, '$1<redacted>@')
    .replace(/(--(?:token|api[-_]?key|secret|password)\s+)[^\s&|;]+/gi, '$1<redacted>')
    .replace(/(--(?:token|api[-_]?key|secret|password)=)[^\s&|;]+/gi, '$1<redacted>');
}

function normalizeRunnerCommandForEvidence(entry) {
  const marker = '=';
  const markerIndex = entry.indexOf(marker);
  if (markerIndex === -1) {
    return entry;
  }

  const prefix = entry.slice(0, markerIndex + 1);
  const command = entry.slice(markerIndex + 1);
  return `${prefix}${normalizeScriptCommandForEvidence(command)}`;
}

function buildRunnerEvidence(runnerCommands, disallowedRunnerHits) {
  const safeSet = new Set(disallowedRunnerHits.map(normalizeRunnerCommandForEvidence));

  for (const entry of runnerCommands) {
    const normalized = normalizeRunnerCommandForEvidence(entry);
    if (/\b(wrangler|pnpm|npm|yarn|vitest|vite|eslint|stylelint|prettier|gh-pages|rimraf|esno|cross-env)\b/i.test(normalized)) {
      safeSet.add(normalized);
    }
  }

  return [...safeSet].sort((left, right) => left.localeCompare(right));
}

function evaluateCoreChecks(context) {
  const checks = [];

  const disallowedRunnerHits = context.runnerCommands
    .filter((line) => /drizzle\s*[-:/]?\s*(migrate|migrator)|drizzle-kit\s+(migrate|push)/i.test(line))
    .sort((a, b) => a.localeCompare(b));
  const runnerEvidence = buildRunnerEvidence(context.runnerCommands, disallowedRunnerHits);

  checks.push(
    createCheck({
      id: 'runner-uniqueness',
      severity: CHECK_SEVERITY.BLOCKER,
      ok: disallowedRunnerHits.length === 0,
      evidence: runnerEvidence,
      diff: { disallowedRunnerHits: disallowedRunnerHits.map(normalizeRunnerCommandForEvidence) },
      recommendation:
        '仅保留 Wrangler 迁移执行链路，移除/禁用 Drizzle runtime migrator 或 drizzle-kit 迁移执行入口。',
    })
  );

  const rootSqlFiles = context.migrationSqlFiles.filter((fileName) => !fileName.startsWith('rollback/'));
  const unexpectedRootFiles = rootSqlFiles
    .filter((fileName) => fileName !== '0000_zippy_blink.sql')
    .sort((a, b) => a.localeCompare(b));

  checks.push(
    createCheck({
      id: 'bootstrap-lane-exclusivity',
      severity: CHECK_SEVERITY.BLOCKER,
      ok:
        rootSqlFiles.includes('0000_zippy_blink.sql') &&
        unexpectedRootFiles.length === 0 &&
        context.rollbackSqlFiles.length === 0,
      evidence: [...context.migrationSqlFiles],
      diff: {
        expected: ['0000_zippy_blink.sql'],
        foundRootSqlFiles: rootSqlFiles.sort((a, b) => a.localeCompare(b)),
        unexpectedRootFiles,
        rollbackSqlFiles: context.rollbackSqlFiles,
      },
      recommendation: '默认 bootstrap 只允许 0000 基线，移除 0001/0002 与 rollback 出现在默认执行链路中的可能性。',
    })
  );

  const structural = buildStructuralDiff(context.sqlStructure, context.schemaStructure, context.snapshotStructure);
  checks.push(
    createCheck({
      id: 'structural-equality-across-artifacts',
      severity: CHECK_SEVERITY.BLOCKER,
      ok: structural.ok,
      evidence: [
        `sql.tables=${Object.keys(context.sqlStructure).length}`,
        `schema.tables=${Object.keys(context.schemaStructure).length}`,
        `snapshot.tables=${Object.keys(context.snapshotStructure).length}`,
      ],
      diff: structural.diff,
      recommendation: '对齐 SQL/schema/snapshot 的表、列、类型、默认值、索引与 FK 定义。',
    })
  );

  const supersedeTexts = context.supersedeCurrentTexts.join('\n');
  const hasForwardMigrationMarker = /前向迁移|forward\s+migration|forward\s+migrat/i;
  const hasExplicitSupersede =
    /supersede|替代|显式\s*替代/i.test(supersedeTexts) &&
    supersedeTexts.includes('enforce-automata-prefix-0000-sql') &&
    hasForwardMigrationMarker.test(supersedeTexts);

  const legacyHasForwardRule = /存量环境必须.*前向迁移|must.*forward.*migrat|forward\s+migration/i.test(
    context.supersedeLegacyText
  );

  checks.push(
    createCheck({
      id: 'supersede-consistency',
      severity: CHECK_SEVERITY.BLOCKER,
      ok: hasExplicitSupersede && legacyHasForwardRule,
      evidence: [
        `currentHasExplicitSupersede=${String(hasExplicitSupersede)}`,
        `legacyHasForwardRule=${String(legacyHasForwardRule)}`,
      ],
      diff: {
        currentHasExplicitSupersede: hasExplicitSupersede,
        legacyHasForwardRule,
      },
      recommendation: '在当前变更中显式声明对 enforce-automata-prefix-0000-sql 冲突前向迁移约束的 supersede。',
    })
  );

  return checks.sort((left, right) => left.id.localeCompare(right.id));
}

function buildSummary(checks) {
  const total = checks.length;
  const passed = checks.filter((item) => item.ok).length;
  const failed = total - passed;
  const blockers = checks.filter((item) => item.severity === CHECK_SEVERITY.BLOCKER && !item.ok).length;
  const warnings = checks.filter((item) => item.severity === CHECK_SEVERITY.WARNING && !item.ok).length;

  return { total, passed, failed, blockers, warnings };
}

function buildErrorReport({ message, evidence = [] }) {
  const checks = [
    createCheck({
      id: 'artifact-parse-integrity',
      severity: CHECK_SEVERITY.BLOCKER,
      ok: false,
      evidence,
      diff: { error: message },
      recommendation: '修复工件缺失或格式错误后重试校验。',
    }),
  ];

  return {
    ok: false,
    summary: buildSummary(checks),
    artifacts: {
      sql: { tableCount: 0, tables: [] },
      schema: { tableCount: 0, tables: [] },
      snapshot: { tableCount: 0, tables: [] },
      migrationSqlFiles: [],
      rollbackSqlFiles: [],
    },
    checks,
  };
}

export function buildValidationReport({
  sqlText,
  schemaFileContents,
  snapshotText,
  runnerCommands = [],
  migrationSqlFiles = [],
  rollbackSqlFiles = [],
  supersedeCurrentTexts = [],
  supersedeLegacyText = '',
}) {
  try {
    const sqlStructure = parseSqlStructure(sqlText);
    const schemaStructure = parseSchemaStructure(schemaFileContents);
    const snapshotStructure = parseSnapshotStructure(snapshotText);

    const context = {
      runnerCommands: uniqSorted(runnerCommands),
      migrationSqlFiles: uniqSorted(migrationSqlFiles),
      rollbackSqlFiles: uniqSorted(rollbackSqlFiles),
      supersedeCurrentTexts: supersedeCurrentTexts.filter(Boolean),
      supersedeLegacyText,
      sqlStructure,
      schemaStructure,
      snapshotStructure,
    };

    const firstCoreChecks = evaluateCoreChecks(context);
    const checksForDeterminism = [...firstCoreChecks].sort((left, right) => left.id.localeCompare(right.id));
    const deterministicHashInput = stableStringify({
      runnerCommands: context.runnerCommands,
      migrationSqlFiles: context.migrationSqlFiles,
      rollbackSqlFiles: context.rollbackSqlFiles,
      supersedeCurrentTexts: context.supersedeCurrentTexts,
      supersedeLegacyText: context.supersedeLegacyText,
      checks: checksForDeterminism,
    });
    const outputHash = createHash('sha256').update(deterministicHashInput).digest('hex');

    const deterministicCheck = createCheck({
      id: 'deterministic-validation',
      severity: CHECK_SEVERITY.BLOCKER,
      ok: outputHash.length === 64,
      evidence: ['single-pass-hash-validation'],
      diff: {
        algorithm: 'sha256',
        outputHash,
      },
      recommendation: '确保校验输出排序稳定，并通过固定输入哈希避免输出膨胀。',
    });

    const checks = [...firstCoreChecks, deterministicCheck].sort((left, right) => left.id.localeCompare(right.id));
    const summary = buildSummary(checks);

    return {
      ok: checks.every((item) => item.ok),
      summary,
      artifacts: {
        sql: {
          tableCount: Object.keys(sqlStructure).length,
          tables: Object.keys(sqlStructure).sort((a, b) => a.localeCompare(b)),
        },
        schema: {
          tableCount: Object.keys(schemaStructure).length,
          tables: Object.keys(schemaStructure).sort((a, b) => a.localeCompare(b)),
        },
        snapshot: {
          tableCount: Object.keys(snapshotStructure).length,
          tables: Object.keys(snapshotStructure).sort((a, b) => a.localeCompare(b)),
        },
        migrationSqlFiles: context.migrationSqlFiles,
        rollbackSqlFiles: context.rollbackSqlFiles,
      },
      checks,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildErrorReport({
      message,
      evidence: ['buildValidationReport-parse-failed'],
    });
  }
}

function resolveRepoRoot() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..', '..');
}

function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function collectPackageJsonPaths(repoRoot) {
  const results = [];

  const walk = (currentPath) => {
    if (!existsSync(currentPath)) {
      return;
    }

    const stat = statSync(currentPath);
    if (!stat.isDirectory()) {
      return;
    }

    if (currentPath.includes(`${path.sep}node_modules`) || currentPath.includes(`${path.sep}.git`)) {
      return;
    }

    const packageJsonPath = path.join(currentPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      results.push(packageJsonPath);
    }

    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      walk(path.join(currentPath, entry.name));
    }
  };

  walk(repoRoot);

  return uniqSorted(results);
}

function collectRunnerCommands(repoRoot) {
  const packageJsonPaths = collectPackageJsonPaths(repoRoot);
  const commands = [];
  for (const packageJsonPath of packageJsonPaths) {
    const json = readJsonIfExists(packageJsonPath);
    if (!json || typeof json.scripts !== 'object') continue;

    for (const [scriptName, command] of Object.entries(json.scripts)) {
      commands.push(`${path.relative(repoRoot, packageJsonPath)}:scripts:${scriptName}=${String(command)}`);
    }
  }

  return uniqSorted(commands);
}

function collectMigrationFiles(repoRoot) {
  const drizzleDir = path.join(repoRoot, 'drizzle');
  const rollbackDir = path.join(drizzleDir, 'rollback');

  const migrationSqlFiles = existsSync(drizzleDir)
    ? readdirSync(drizzleDir)
        .filter((fileName) => fileName.endsWith('.sql'))
        .sort((left, right) => left.localeCompare(right))
    : [];

  const rollbackSqlFiles = existsSync(rollbackDir)
    ? readdirSync(rollbackDir)
        .filter((fileName) => fileName.endsWith('.sql'))
        .map((fileName) => `rollback/${fileName}`)
        .sort((left, right) => left.localeCompare(right))
    : [];

  return { migrationSqlFiles, rollbackSqlFiles };
}

function collectSupersedeTexts(repoRoot) {
  const currentBase = path.join(repoRoot, 'openspec', 'changes', 'evaluate-single-baseline-migration');
  const legacySpec = path.join(
    repoRoot,
    'openspec',
    'changes',
    'enforce-automata-prefix-0000-sql',
    'specs',
    'automata-table-prefix',
    'spec.md'
  );

  const currentPaths = [
    path.join(currentBase, 'proposal.md'),
    path.join(currentBase, 'design.md'),
    path.join(currentBase, 'specs', 'migration-strategy', 'spec.md'),
  ];

  const supersedeCurrentTexts = [];
  for (const filePath of currentPaths) {
    if (!existsSync(filePath)) {
      continue;
    }

    try {
      supersedeCurrentTexts.push(readFileSync(filePath, 'utf-8'));
    } catch {
      continue;
    }
  }

  let supersedeLegacyText = '';
  if (existsSync(legacySpec)) {
    try {
      supersedeLegacyText = readFileSync(legacySpec, 'utf-8');
    } catch {
      supersedeLegacyText = '';
    }
  }

  return { supersedeCurrentTexts, supersedeLegacyText };
}

function loadArtifacts(repoRoot) {
  const drizzleDir = path.join(repoRoot, 'drizzle');
  const schemaDir = path.join(repoRoot, 'packages', 'shared', 'src', 'db', 'schema');
  const metaDir = path.join(drizzleDir, 'meta');

  if (!existsSync(drizzleDir)) {
    throw new Error(`Missing validation target directory: ${drizzleDir}`);
  }

  if (!existsSync(schemaDir)) {
    throw new Error(`Missing validation target directory: ${schemaDir}`);
  }

  if (!existsSync(metaDir)) {
    throw new Error(`Missing validation target directory: ${metaDir}`);
  }

  const baselineCandidates = readdirSync(drizzleDir)
    .filter((fileName) => /^0000_.*\.sql$/i.test(fileName))
    .sort((left, right) => left.localeCompare(right));

  if (baselineCandidates.length !== 1) {
    throw new Error(
      `Expected exactly one 0000 baseline SQL in drizzle/, found ${baselineCandidates.length}: ${baselineCandidates.join(', ')}`
    );
  }

  const snapshotCandidates = readdirSync(metaDir)
    .filter((fileName) => /^0000_.*\.json$/i.test(fileName))
    .sort((left, right) => left.localeCompare(right));

  if (snapshotCandidates.length !== 1) {
    throw new Error(
      `Expected exactly one 0000 snapshot JSON in drizzle/meta/, found ${snapshotCandidates.length}: ${snapshotCandidates.join(', ')}`
    );
  }

  const sqlPath = path.join(drizzleDir, baselineCandidates[0]);
  const snapshotPath = path.join(metaDir, snapshotCandidates[0]);

  const schemaFileContents = readdirSync(schemaDir)
    .filter((fileName) => fileName.endsWith('.ts'))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => readFileSync(path.join(schemaDir, fileName), 'utf-8'));

  const { migrationSqlFiles, rollbackSqlFiles } = collectMigrationFiles(repoRoot);
  const { supersedeCurrentTexts, supersedeLegacyText } = collectSupersedeTexts(repoRoot);

  return {
    sqlText: readFileSync(sqlPath, 'utf-8'),
    schemaFileContents,
    snapshotText: readFileSync(snapshotPath, 'utf-8'),
    runnerCommands: collectRunnerCommands(repoRoot),
    migrationSqlFiles,
    rollbackSqlFiles,
    supersedeCurrentTexts,
    supersedeLegacyText,
  };
}

function runCli() {
  const report = buildValidationReport(loadArtifacts(resolveRepoRoot()));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) {
    process.exitCode = 1;
  }
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  runCli();
}
