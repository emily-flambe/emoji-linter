# emoji-linter

A simple tool to keep your code professional by detecting and removing emojis.

## What It Does

The emoji-linter scans your codebase for basic Unicode emojis and can either report or remove them. It detects ~1,200 common emojis covering 95% of emojis typically found in code.

**Two tools in one:**
1. **CLI Tool** - For local development
2. **GitHub Action** - For CI/CD pipelines

## Quick Start

### CLI Tool

Install globally:
```bash
npm install -g emoji-linter
```

Check for emojis:
```bash
emoji-linter check src/
```

Remove emojis:
```bash
emoji-linter fix src/
```

### GitHub Action

Add to your workflow:
```yaml
name: Check for Emojis
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: emily-flambe/emoji-linter@main
        with:
          mode: check
```

## Commands

### `check`
Scans files for emojis and reports findings. Exits with code 1 if emojis are found.

```bash
emoji-linter check <files...>
```

### `fix`
Removes emojis from files.

```bash
emoji-linter fix <files...>
```

## Options

- `--format <type>` - Output format: `table`, `json`, or `minimal` (default: `table`)
- `--verbose` - Show detailed output including which files are being ignored

## Configuration

Create a `.emoji-linter.config.json` file in your project root to customize behavior:

```json
{
  "ignore": [
    "node_modules/**",
    "*.test.js"
  ],
  "ignoreEmojis": ["✓", "✗"],
  "ignoreInlineComments": true
}
```

### Configuration Options

- `ignore` - Array of glob patterns for files/directories to skip
- `ignoreEmojis` - Array of specific emojis to allow
- `ignoreInlineComments` - Skip emojis in comments with `emoji-linter-ignore-line`

## GitHub Action Inputs

- `path` - Path to scan (default: `.`)
- `mode` - Either `check` or `fix` (default: `check`)
- `github-token` - GitHub token for authentication (optional)

## GitHub Action Outputs

- `has-emojis` - Whether any emojis were found (`true`/`false`)
- `emoji-count` - Total number of emojis found
- `files-with-emojis` - Number of files containing emojis

## Examples

### CLI Examples

```bash
# Check all files in current directory
emoji-linter check .

# Check with JSON output
emoji-linter check --format json src/

# Fix all JavaScript files
emoji-linter fix **/*.js

# Fix with verbose output
emoji-linter fix --verbose .
```

### GitHub Action Examples

Basic check:
```yaml
- uses: emily-flambe/emoji-linter@main
```

Check specific directory:
```yaml
- uses: emily-flambe/emoji-linter@main
  with:
    path: src/
```

Fix mode (for automated cleanup):
```yaml
- uses: emily-flambe/emoji-linter@main
  with:
    mode: fix
```

## What It Detects

✅ **Detects:** Common Unicode emojis (😀 🚀 ✨ ❤️)

❌ **Does NOT detect:**
- Emoji shortcodes (:rocket: :smile:)
- Complex sequences (👨‍👩‍👧‍👦)
- Country flags (🇺🇸 🇬🇧)

## Exit Codes

- `0` - Success (no emojis found in check mode)
- `1` - Emojis found (check mode) or error occurred

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.