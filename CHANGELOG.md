# Change Log

## [Unreleased]

- Abitlity to choose the parse method: `Regex` (no dependencies) or `syntax-tree` (requires `rust-analyzer` extension)
- Ability to use `rust-analyzer` as a dependency for document generation.
  - Parsing the syntax-tree will allow the addition of `Panic` sections to the documentation.

## [v0.1.3] - 2025-05-24

- Bug fix for generic functions.
- Bug fix for function parsing for arguments containing commas.

## [v0.1.2] - 2025-05-04

- Extension settings
  - Added setting `rustdocstring.includeExamples`
  - Added setting `rustdocstring.examplesOnlyForPublicOrExtern`
  - Added setting `rustdocstring.includeSafetyDetails`

## [v0.1.1] Initial release - 2025-05-04

- Initial release with support for `fn`, `struct`, and `enum` Rust items
- Context-aware comment generation
- Snippet tabstops for ease of editing
- Example code block generation
- Test for code coverage
