/**
 * Dispatcher for generating Rust doc comments based on the type of code item.
 * Supports functions, structs, enums, and traits. Delegates to specialized handlers.
 *
 * @param {string} line - The normalized line of Rust code (a signature).
 * @returns {string|null} - The formatted doc comment, or null if unsupported.
 */
function generateDocComment(line) {
    const itemType = getRustItemType(line);
    if (!itemType) return null;

    switch (itemType) {
        case 'function':
            return generateFunctionDoc(line);
        case 'struct':
            return generateStructDoc(line);
        case 'enum':
            return generateEnumDoc(line);
        // case 'trait':
        //     return generateTraitDoc(line);
        default:
            return null;
    }
}

/**
 * Determines the type of Rust item from a signature line.
 *
 * @param {string} line - A line of Rust code.
 * @returns {"function"|"struct"|"enum"|null} - The detected item type.
 */
function getRustItemType(line) {
    if (/fn\s+\w+\s*\(/.test(line)) return 'function';
    if (/struct\s+\w+/.test(line)) return 'struct';
    if (/enum\s+\w+/.test(line)) return 'enum';
    // if (/trait\s+\w+/.test(line)) return 'trait';
    return null;
}

/**
 * Generates doc comments for Rust functions.
 *
 * @param {string} line - The normalized function signature.
 * @returns {string|null} - The doc comment block.
 */
function generateFunctionDoc(line) {
    // Attempt to match a Rust function signature.
    const fnMatch = line.match(/fn\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^;{]+))?/);
    if (!fnMatch) return null; // If no match, return nothing (unsupported line)

    // Destructure the match results: function name, arguments, and optional return type.
    const [, name, args, returnType] = fnMatch;

    // Gets the return type.
    const cleanedReturn = returnType ? returnType.trim() : null;

    // Sets the tab stop count for the parameter. Description is always 1.
    let currentTabStop = 2;

    // Parse and format each function argument into a markdown line with snippet placeholder.
    const params = args
        .split(',')
        .map(p => p.trim())
        .filter(Boolean) // Remove empty strings
        .map(param => {
            const [argName, argType] = param.split(':').map(s => s.trim());
            return `- \`${argName}\` (\`${argType}\`) - \${${currentTabStop++}:Describe this parameter.}`;
        });

    // Build the full documentation block line by line.
    const docLines = [];
    
    // Description line.
    docLines.push(` \${1:Describe this function.}`); // General function description

    // Arguments section (only if there are parameters)
    if (params.length > 0) {
        docLines.push(``, `# Arguments`, ``);
        docLines.push(...params);
    }

    // Return section (only if return type exists)
    if (cleanedReturn) {
        docLines.push(``, `# Returns`, ``);
        docLines.push(`- \`${cleanedReturn}\` - \${${currentTabStop++}:Describe the return value.}`);
    }

    // Check if rust functions return type is Result
    const isFallible = /Result\s*<.+>/.test(cleanedReturn || '');

    // Errors section
    if (isFallible) {
        docLines.push(``, `# Errors`, ``);
        docLines.push(`\${${currentTabStop++}:Describe possible errors.}`);
    }

    // TODO Make editable configuration to include example sections as a checkbox in the settings.

    // Examples section
    docLines.push(``, `# Examples`, ``);
    docLines.push('```');
    docLines.push(`use crate::\${${currentTabStop++}:...};`, ``);
    docLines.push(`${name}();`); // Put the function here
    docLines.push('```');

    // Prefix all lines with Rust doc syntax (`///`) and return as a snippet string
    return [
        docLines[0], // First line is already preceded by `///` in the editor, skip it
        ...docLines.slice(1).map(line => `/// ${line}`)
    ].join('\n');
}

/**
 * Generates doc comments for Rust structs.
 *
 * @param {string} line - The struct declaration line.
 * @returns {string|null} - The doc comment block.
 */
function generateStructDoc(line) {
    // Strip comments from end of line
    line = line.replace(/\/\/.*$/, '').trim();

    // Match struct name and optional body: {}, (), or unit
    const structMatch = line.match(/struct\s+(\w+)(\s*\([^)]*\)|\s*\{[^}]*\})?\s*;?/);
    if (!structMatch) return null;

    const name = structMatch[1];
    const body = structMatch[2]?.trim() || '';
    let currentTabStop = 2;
    const docLines = [` \${1:Describe this struct.}`];

    const fields = [];

    if (body.startsWith('{')) {
        // Field struct
        const fieldList = body.slice(1, -1).split(',').map(f => f.trim()).filter(Boolean);
        for (const field of fieldList) {
            const [fieldName, fieldType] = field.split(':').map(s => s.trim());
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
    } else {
        // Unit struct
        fields.push(`This is a unit struct with no fields.`);
    }

    if (fields.length > 0) {
        docLines.push(``, `# Fields`, ``, ...fields);
    }

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
    } else {
        // Unit-style struct
        docLines.push(`let s = ${name};`);
    }

    docLines.push('```');

    return [docLines[0], ...docLines.slice(1).map(line => `/// ${line}`)].join('\n');
}

/**
 * Generates doc comments for Rust enums.
 *
 * @param {string} line - The enum declaration line.
 * @returns {string|null} - The doc comment block.
 */
function generateEnumDoc(line) {
    const enumMatch = line.match(/enum\s+(\w+)/);
    if (!enumMatch) return null;

    const name = enumMatch[1];
    return [
        `\${1:Describe the purpose of the \`${name}\` enum.}`,
        ``,
        `# Variants`,
        ``,
        `- \${2:VariantName} - \${3:Description of the variant.}`,
        ``,
        `# Examples`,
        ``,
        '```',
        `let value = ${name}::\${4:Variant};`,
        '```'
    ].map((line, i) => i === 0 ? line : `/// ${line}`).join('\n');
}

// /**
//  * Generates doc comments for Rust traits.
//  *
//  * @param {string} line - The trait declaration line.
//  * @returns {string|null} - The doc comment block.
//  */
// function generateTraitDoc(line) {
//     const traitMatch = line.match(/trait\s+(\w+)/);
//     if (!traitMatch) return null;

//     const name = traitMatch[1];
//     return [
//         `\${1:Describe the purpose of the \`${name}\` trait.}`,
//         ``,
//         `# Methods`,
//         ``,
//         `- \${2:fn method()} - \${3:Description of the method.}`,
//         ``,
//         `# Examples`,
//         ``,
//         '```',
//         `impl ${name} for \${4:Type} {}`,
//         '```'
//     ].map((line, i) => i === 0 ? line : `/// ${line}`).join('\n');
// }

module.exports = { generateDocComment };