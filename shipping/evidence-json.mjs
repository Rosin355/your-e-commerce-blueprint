/** Keep evidence records on separate lines so catalog snapshots stay reviewable in Git. */
export function evidenceJson(value, key = '', depth = 0) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const indent = '  '.repeat(depth);
  const childIndent = indent + '  ';
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    const records = ['nodes', 'rows', 'cases'].includes(key);
    return '[\n' + value.map(item => childIndent + (records ? JSON.stringify(item) : evidenceJson(item, '', depth + 1))).join(',\n') + '\n' + indent + ']';
  }
  const entries = Object.entries(value).filter(([, item]) => item !== undefined);
  if (!entries.length) return '{}';
  return '{\n' + entries.map(([field, item]) => childIndent + JSON.stringify(field) + ': ' + evidenceJson(item, field, depth + 1)).join(',\n') + '\n' + indent + '}';
}
