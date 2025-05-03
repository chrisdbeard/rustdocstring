# RustDocString - VSCode Rust Docstring Generator

<!-- [![Installs](https://vsmarketplacebadges.dev/installs-short/chrisdbeard.rustdocstring.svg)](https://marketplace.visualstudio.com/items?itemName=ChrisBeard.rutodocstring) -->
<!-- [![Rating](https://vsmarketplacebadges.dev/rating-short/chrisdbeard.rustdocstring.svg)](https://marketplace.visualstudio.com/items?itemName=ChrisBeard.rustdocstring&ssr=false#review-details) -->
<!-- [![Build Status](https://github.com/chrisdbeard/rustdocstring/actions/workflows/test_and_publish.yml/badge.svg)](https://github.com/chrisdbeard/rustdocstring/actions/workflows/test_and_publish.yml) -->
![Stars](https://img.shields.io/github/stars/chrisdbeard/rustdocstring?style=social)
![version](https://img.shields.io/badge/version-0.0.1-green)
![License](https://img.shields.io/github/license/chrisdbeard/rustdocstring)
![Issues](https://img.shields.io/github/issues/chrisdbeard/rustdocstring)
![VSCode](https://img.shields.io/badge/vscode-extension-blue?logo=visualstudiocode)
![Rust](https://img.shields.io/badge/rust-supported-orange?logo=rust)

**RustDocString** is a Visual Studio Code extension that generates professional, structured Rust documentation comments with a single trigger. It intelligently detects function, struct, and enum declarations and produces ready-to-edit `///` doc blocks tailored to each item.

## Features

- Auto-generates Rust doc comments by typing `///` above a code item.
- Context-aware parsing for:
    - `fn` (with support fork *keyword modifiers* `pub`, `pub(...)`, `async`, `unsafe`, and `extern`)
      - Includes `# Arguments` and `# Returns` sections as appropriate.
    - `struct` (field and tuple style)
      - Includes `# Fields` section as appropriate.
    - `enum` (with unit, tuple, and struct variants)
      - Includes `# Variants` section as appropriate.
- Includes `# Safety`, `# Errors`, and `# Examples` sections as appropriate.
- Snippet tabstops make customization fast and consistent.
- Works seamlessly with multi-line signatures and skips attributes like `#[derive(...)]`.

## Quick Start

1. Install the extension from the VSCode Marketplace.
2. Open any Rust file.
3. Above a Rust item (function, struct, or enum), type ///.
4. Accept the completion snippet: "Generate Rust Doc Comment".
> Works out-of-the-box — no additional setup required.

## How It Works

RustDocString uses a signature parser (`utils.js`) to scan for the next Rust item and normalize its declaration. Then, depending on the item type:
- **Functions** → `gen_fn_doc.js`
- **Structs** → `gen_struct_doc.js`
- **Enums** → `gen_enum_doc.js`
These generate snippet-style doc blocks with Markdown formatting, code examples, and placeholder descriptions.

## Extension Settings

*No configuration options available yet.*
The extension is designed to work automatically when you type `///`.

> Planned: Enable/disable sections (e.g., examples, safety blocks) via settings.

## Requirements

- Visual Studio Code 1.80+ (recommended)
- Rust code with valid syntax (detected using regex-based scanning)

## Installation

Via Marketplace (coming soon):

```bash
ext install rustdocstring
```

Or install from source:

```bash
git clone https://github.com/your-org/rustdocstring
cd rustdocstring
npm install
npm run compile
```

Then launch the extension in development mode with VSCode.

## Known Issues

- Does not yet support:
    - Traits
    - Unions
    - Individual enum variant document generation
      - *Creates the documentation for the enum as a whole. The `cargo doc` creates a separate section for enum variants.*

## Changelog

Check the [CHANGELOG.md](CHANGELOG.md) for any version changes.

## Reporting Issues

- Report any issues on the github [GitHub Issues page](https://github.com/chrisdbeard/rustdocstring/issues). Use the `bug` or `feature request` labels where appropriate. Follow the template and add as much information as possible.

## Contributing

The source code is available on [GitHub](https://github.com/chrisdbeard/rustdocstring), and contributions of all kinds are welcome — whether it's filing an issue, requesting a feature, or submitting a pull request.

- Found a bug or have an idea? Please open an issue on the [GitHub Issues page](https://github.com/chrisdbeard/rustdocstring/issues). Use the `bug` or `feature request` labels where appropriate.
- To contribute code:
  1. Fork the repository.
  2. Create a feature branch.
  3. Submit a pull request against the `master` branch.
  4. If your changes introduce or modify functionality, consider updating the README as well.
- While there isn’t an official contribution guide or code of conduct yet, standard open source etiquette applies. Be constructive, respectful, and collaborative.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details
