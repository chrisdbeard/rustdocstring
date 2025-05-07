const assert = require('assert');
const { generateDocComment } = require('../docgen');
const { generateFunctionDoc } = require('../gen_fn_doc');
const { generateStructDoc } = require('../gen_struct_doc');
const { generateEnumDoc } = require('../gen_enum_doc');
const { findNextSignatureBlock } = require('../utils');

describe('generateDocComment()', () => {
    it('generates doc for function', () => {
        const input = 'pub fn compute_sum(a: i32, b: i32) -> i32 {';
        const output = generateDocComment(input, {
            includeExamples: true,
            examplesOnlyForPublicOrExtern: false,
            includeSafetyDetails: true
          });
        assert.ok(output.includes('# Arguments'));
        assert.ok(output.includes('`a` (`i32`)'));
        assert.ok(output.includes('# Returns'));
        assert.ok(output.includes('`i32`'));
    });

    it('generates doc for struct', () => {
        const input = 'pub struct Point { x: f64, y: f64 }';
        const output = generateDocComment(input, {
            includeExamples: true,
            examplesOnlyForPublicOrExtern: false,
            includeSafetyDetails: true
          });
        assert.ok(output.includes('# Fields'));
        assert.ok(output.includes('`x` (`f64`)'));
        assert.ok(output.includes('`y` (`f64`)'));
    });

    it('generates doc for enum', () => {
        const input = 'enum Color { Red, Green, Blue }';
        const output = generateDocComment(input, {
            includeExamples: true,
            examplesOnlyForPublicOrExtern: false,
            includeSafetyDetails: true
          });
        assert.ok(output.includes('# Variants'));
        assert.ok(output.includes('`Red`'));
    });

    it('returns null for unsupported input', () => {
        assert.strictEqual(generateDocComment('trait SomeTrait {}', {
            includeExamples: true,
            examplesOnlyForPublicOrExtern: false,
            includeSafetyDetails: true
          }), null);
    });
});

describe('generateFunctionDoc()', () => {
    it('includes async/unsafe modifiers in example block', () => {
        const input = 'pub async unsafe fn risky_call() -> Result<(), Box<dyn Error>> {';
        const doc = generateFunctionDoc(input, true, true, true);
        assert.ok(doc.includes('async {'));
        assert.ok(doc.includes('unsafe {'));
        assert.ok(doc.includes('# Safety'));
        assert.ok(doc.includes('# Errors'));
    });

    it('handles simple function without return', () => {
        const input = 'fn hello(name: &str) {';
        const doc = generateFunctionDoc(input, true, true, true);
        assert.ok(doc.includes('`name` (`&str`)'));
        assert.ok(!doc.includes('# Returns'));
    });

    it('includes arguments and return section', () => {
        const input = 'pub fn add(a: i32, b: i32) -> i32 {';
        const output = generateFunctionDoc(input, true, true, true);
        assert.ok(output.includes('# Arguments'), 'Missing arguments section');
        assert.ok(output.includes('`a` (`i32`)'));
        assert.ok(output.includes('`b` (`i32`)'));
        assert.ok(output.includes('# Returns'), 'Missing return section');
        assert.ok(output.includes('`i32`'));
    });

    it('handles unsafe functions', () => {
        const input = 'pub unsafe fn access_raw(ptr: *const u8) -> u8 {';
        const output = generateFunctionDoc(input, true, true, true);
        assert.ok(output.includes('# Safety'), 'Missing safety section');
        assert.ok(output.includes('**This function is `unsafe` because:**'));
        assert.ok(output.includes('Describe unsafe behavior'), 'Missing unsafe placeholder');
    });

    it('handles extern functions', () => {
        const input = 'pub extern "C" fn c_func(x: i32) -> i32 {';
        const output = generateFunctionDoc(input, true, true, true);
        assert.ok(output.includes('# Safety'), 'Missing safety section');
        assert.ok(output.includes('called in the correct program state to avoid UB'), 'Missing UB safety line');
    });

    it('handles async functions', () => {
        const input = 'pub async fn fetch_data() -> Result<String, Box<dyn Error>> {';
        const output = generateFunctionDoc(input, true, true, true);
        assert.ok(output.includes('# Errors'), 'Missing errors section');
        assert.ok(output.includes('fetch_data().await'), 'Missing async example');
    });

    it('handles async unsafe extern functions', () => {
        const input = 'pub async unsafe extern "C" fn full_danger() -> Result<(), MyError> {';
        const output = generateFunctionDoc(input, true, true, true);
        assert.ok(output.includes('# Safety'), 'Missing safety section');
        assert.ok(output.includes('unsafe { full_danger().await }'), 'Missing async unsafe example');
        assert.ok(output.includes('# Errors'), 'Missing errors section');
    });

    it('returns null on invalid input', () => {
        const output = generateFunctionDoc('this is not a function', true, true, true);
        assert.strictEqual(output, null);
    });

	it('handles pub(crate) visibility', () => {
        const input = 'pub(crate) fn public_function_in_crate() {';
        const doc = generateFunctionDoc(input, true, true, true);
        assert.ok(doc.includes('Describe this function'), 'Missing main description');
        assert.ok(doc.includes('# Examples'), 'Missing example section');
    });

    it('handles pub(in crate::testing) visibility', () => {
        const input = 'pub(in crate::testing) fn public_function_in_my_mod() {';
        const doc = generateFunctionDoc(input, true, true, true);
        assert.ok(doc.includes('Describe this function'), 'Missing main description');
    });

    it('handles pub(self) visibility', () => {
        const input = 'pub(self) fn public_function_in_nested() {';
        const doc = generateFunctionDoc(input, true, true, true);
        assert.ok(doc.includes('# Examples'), 'Missing example section');
    });

    it('handles pub(super) visibility', () => {
        const input = 'pub(super) fn public_function_in_super_mod() {';
        const doc = generateFunctionDoc(input, true, true, true);
        assert.ok(doc.includes('Describe this function'), 'Missing placeholder description');
    });

    it('respects includeExamples = false and hides examples section', () => {
        const input = 'fn private_internal() {}';
        const doc = generateFunctionDoc(input, false, false, true);
        assert.ok(!doc.includes('# Examples'), 'Should not include example section for private function');
    });

    it('respects examplesOnlyForPublicOrExtern = true and hides examples for private function', () => {
        const input = 'fn private_internal() {}';
        const doc = generateFunctionDoc(input, true, true, true);
        assert.ok(!doc.includes('# Examples'), 'Should not include example section for private function');
    });
    
    it('includes examples when examplesOnlyForPublicOrExtern = true and function is pub', () => {
        const input = 'pub fn exposed() {}';
        const doc = generateFunctionDoc(input, true, true, true);
        assert.ok(doc.includes('# Examples'), 'Should include example section for public function');
    });
});

describe('generateStructDoc()', () => {
    it('returns null for unit struct', () => {
        assert.strictEqual(generateStructDoc('struct Empty;', true, true), null);
        assert.strictEqual(generateStructDoc('struct Nothing {}', true, true), null);
    });

    it('documents tuple struct', () => {
        const input = 'struct Pair(i32, f64);';
        const doc = generateStructDoc(input, true, false);
        assert.ok(doc.includes('`field_0` (`i32`)'));
        assert.ok(doc.includes('`field_1` (`f64`)'));
        assert.ok(doc.includes('# Examples'));
    });

	it('handles struct with many fields', () => {
        const input = `
            pub struct MegaStruct {
                a: i32, b: i32, c: i32, d: i32, e: i32,
                f: i32, g: i32, h: i32, i: i32, j: i32,
                k: i32, l: i32, m: i32, n: i32, o: i32,
                p: i32, q: i32, r: i32, s: i32, t: i32
            }
        `;
        const doc = generateStructDoc(input, true, true);
        assert.ok(doc.includes('# Fields'), 'Missing fields section');
        assert.ok((doc.match(/- `/g) || []).length >= 20, 'Should document 20+ fields');
    });
});

describe('generateEnumDoc()', () => {
    it('handles all variant styles', () => {
        const input = `
            enum Message {
                Quit,
                Move { x: i32, y: i32 },
                Write(String),
            }
        `;
        const doc = generateEnumDoc(input, true, false);
        assert.ok(doc.includes('`Quit`'));
        assert.ok(doc.includes('`Move { x, y }`'));
        assert.ok(doc.includes('`Write(String)`'));
        assert.ok(doc.includes('# Examples'));
    });

    it('returns null for invalid enum', () => {
        const badEnum = 'enum NotValid';
        assert.strictEqual(generateEnumDoc(badEnum, true, true), null);
    });

	it('handles enum with mixed variant types', () => {
		const input = `
			enum Message {
				Quit,
				Move { x: i32, y: i32 },
				Write(String),
				ChangeColor(i32, i32, i32),
			}
		`;
		const doc = generateEnumDoc(input, true, true);
		assert.ok(doc.includes('# Variants'), 'Missing variants section');
		assert.ok(doc.includes('- `Quit`'), 'Missing unit variant');
		assert.ok(doc.includes('- `Move { x, y }`'), 'Missing struct variant');
		assert.ok(doc.includes('- `Write(String)`'), 'Missing tuple variant');
		assert.ok(doc.includes('- `ChangeColor(i32, i32, i32)`'), 'Missing multi-tuple variant');
	});

    it('handles enum with long tuple and field variants', () => {
        const input = `
            enum ComplexEnum {
                Tuple(u8, u16, u32, u64, usize),
                Field { a: i32, b: i32, c: i32, d: i32, e: i32 }
            }
        `;
        const doc = generateEnumDoc(input, true, true);
        assert.ok(doc.includes('Tuple(u8, u16, u32, u64, usize)'), 'Missing tuple variant formatting');
        assert.ok(doc.includes('Field { a, b, c, d, e }'), 'Missing field variant formatting');
    });
});

describe('findNextSignatureBlock()', () => {
    function createMockDocument(lines) {
        return {
            lineCount: lines.length,
            lineAt: (i) => ({ text: lines[i] })
        };
    }

    it('extracts a simple function signature', () => {
        const doc = createMockDocument([
            '///',
            'pub fn do_work(a: i32) -> i32 {',
            '    // body'
        ]);
        // @ts-ignore
        const result = findNextSignatureBlock(doc, 0);
        assert.strictEqual(result, 'pub fn do_work(a: i32) -> i32 {');
    });

    it('skips attribute lines', () => {
        const doc = createMockDocument([
            '///',
            '#[inline]',
            '#[cfg(feature = "foo")]',
            'fn hello() -> String {',
            '}'
        ]);
        // @ts-ignore
        const result = findNextSignatureBlock(doc, 0);
        assert.strictEqual(result, 'fn hello() -> String {');
    });

    it('handles struct with body', () => {
        const doc = createMockDocument([
            '///',
            'pub struct Point {',
            '    x: i32,',
            '    y: i32',
            '}'
        ]);
        // @ts-ignore
        const result = findNextSignatureBlock(doc, 0);
        assert.ok(result.startsWith('pub struct Point'));
        assert.ok(result.includes('x: i32'));
    });

    it('returns null for empty lines', () => {
        const doc = createMockDocument(['']);
        // @ts-ignore
        const result = findNextSignatureBlock(doc, 0);
        assert.strictEqual(result, null);
    });

    it('returns null for comment-only lines', () => {
        const doc = createMockDocument(['// just a comment']);
        // @ts-ignore
        const result = findNextSignatureBlock(doc, 0);
        assert.strictEqual(result, null);
    });

	it('returns null when invoked inside a struct before a field', () => {
        const doc = createMockDocument([
            'pub struct Wrapper {',
            '    ///',              // <-- simulate user typing here
            '    field1: i32,',
            '}',
            'pub fn real_function() {}'
        ]);

        // Try to generate doc from line 1 (inside the struct)
        const result = findNextSignatureBlock(doc, 1);

        // Since we are inside a struct and no valid item starts here, this should be null
        assert.strictEqual(result, null, 'Should return null inside struct before field');
    });

	it('returns null when invoked inside a function body', () => {
		const doc = createMockDocument([
			'pub fn example() {',
			'    ///',             // User types doc comment here
			'    let x = 5;',
			'}',
			'pub fn another() {}'
		]);
	
		const result = findNextSignatureBlock(doc, 1);
		assert.strictEqual(result, null, 'Should return null inside function body');
	});

	it('returns null when invoked inside an enum before a variant', () => {
		const doc = createMockDocument([
			'enum Message {',
			'    ///',               // Trying to document inside the enum
			'    Quit,',
			'}',
			'pub fn done() {}'
		]);
	
		const result = findNextSignatureBlock(doc, 1);
		assert.strictEqual(result, null, 'Should return null inside enum before a variant');
	});
});