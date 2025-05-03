/**
 * Generates a Rust-style documentation block for a `struct` declaration.
 *
 * This function handles both:
 * - Field-style structs: `struct Name { field: Type, ... }`
 * - Tuple-style structs: `struct Name(Type, ...)`
 *
 * Unit structs (e.g., `struct X;` or `struct Y {}`) are ignored as they don't require
 * field-level documentation.
 *
 * The generated doc block includes:
 * - A general description placeholder.
 * - A `# Fields` section with placeholders for each field.
 * - A `# Examples` section demonstrating how to instantiate the struct.
 *
 * Tab stops (`${n:...}`) are inserted for editor snippet expansion.
 *
 * @param {string} line - A string containing the full struct declaration, including its body.
 * @returns {string|null} The formatted doc comment block, or `null` if the input is not a valid documentable struct.
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
    docLines.push(``, `# Examples`, ``, '```', `use crate::\${${currentTabStop++}:...};`, ``);

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

    docLines.push('```'); // End the example section markdown code block

    // Format as Rust doc comment block
    return [docLines[0], ...docLines.slice(1).map(line => `/// ${line}`)].join('\n');
}

module.exports = { generateStructDoc };