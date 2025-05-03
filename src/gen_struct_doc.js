/**
 * Generates doc comments for Rust structs.
 *
 * @param {string} line - The struct declaration and block in a single line.
 * @returns {string|null} - The doc comment block.
 */
function generateStructDoc(line) {
    // Reject unit structs (single struct no fields)
    if (/struct\s+\w+\s*(;|\{\})/.test(line)) return null; // Struct ends with ';' or '{}'

     // Remove visibility modifier (pub, pub(...))
     const cleanLine = line.replace(/pub(\s*\([^)]*\))?\s+/g, '');

    // Match struct name and optional body: {}, (), or unit
    const structMatch = cleanLine.match(/struct\s+(\w+)\s*(\([^)]*\)|\{[\s\S]*\})/);
    if (!structMatch) return null;

    const name = structMatch[1];
    const body = structMatch[2]?.trim() || '';
    let currentTabStop = 2;
    const docLines = [` \${1:Describe this struct.}`];

    const fields = [];

    // Find all fields for the structure can be a Field struct or a Tuple struct -- "struct Temp {" or "struct Temp("
    if (body.startsWith('{')) {
        // Field struct
        const fieldList = body.slice(1, -1).split(',').map(f => f.trim()).filter(Boolean);
        for (const field of fieldList) {
            const cleanedField = field.replace(/pub(\s*\([^)]*\))?\s+/, '').trim(); // Remove 'pub' from field
            const [fieldName, fieldType] = cleanedField.split(':').map(s => s.trim());
            if (fieldName && fieldType) {
                fields.push(`- \`${fieldName}\` (\`${fieldType}\`) - \${${currentTabStop++}:Describe this field.}`);
            }
        }
    } else if (body.startsWith('(')) {
        // Tuple struct
        const types = body.slice(1, -1).split(',').map(t => t.trim()).filter(Boolean);
        for (let i = 0; i < types.length; i++) {
            fields.push(`- \`field_${i}\` (\`${types[i]}\`) - \${${currentTabStop++}:Describe this tuple field.}`);
        }
    }

    // Struct Fields section
    if (fields.length > 0) {
        docLines.push(``, `# Fields`, ``, ...fields);
    }

    // Examples section
    docLines.push(``, `# Examples`, ``, '```', `use crate::...;`, ``);

    if (body.startsWith('{')) {
        // Field-style struct
        docLines.push(`let s = ${name} {`);
        for (const field of fields) {
            const fieldName = field.match(/`([^`]+)`/)[1]; // extract field name
            docLines.push(`    ${fieldName}: value,`);
        }
        docLines.push(`};`);
    } else if (body.startsWith('(')) {
        // Tuple-style struct
        const types = body.slice(1, -1).split(',').map(t => t.trim()).filter(Boolean);
        const tupleArgs = types.map(() => `value`).join(', ');
        docLines.push(`let s = ${name}(${tupleArgs});`);
    }

    docLines.push('```');

    return [docLines[0], ...docLines.slice(1).map(line => `/// ${line}`)].join('\n');
}

module.exports = { generateStructDoc };