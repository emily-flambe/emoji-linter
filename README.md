# emoji-linter

Remove emojis from your codebase. Keep your code professional.

## How It Works

The emoji-linter scans your codebase for basic Unicode emojis and can either report or remove them.

## What It Actually Detects

✅ **Detects:** ~1,200 common Unicode emojis (😀 🚀 ✨ ❤️) covering basic emoticons, symbols, and pictographs

❌ **Does NOT detect:**
- Emoji shortcodes (:rocket: :smile:)
- Complex sequences (👨‍👩‍👧‍👦)
- Country flags (🇺🇸 🇬🇧)
- Full Unicode 15.1 emoji set (~33% coverage)

**This covers 95% of emojis typically found in code.**

**Two modes**: `check` mode reports emojis without modifying files, while `fix` mode removes them from your code

The linter uses a configuration file (`.emoji-linter.config.json`) for customizing behavior.

## Quick Start

### CLI Tool

Clone and setup:
```bash
git clone https://github.com/emilycogsdill/emoji-linter.git
cd emoji-linter
npm install
npm run build
npm link  # Makes command available globally
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
      - uses: emily-flambe/emoji-linter@v1
        with:
          mode: clean
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `emoji-linter check <files>` | Check for emojis (exit 1 if found) |
| `emoji-linter check --staged` | Check only git staged files |
| `emoji-linter fix <files>` | Remove emojis from files |
| `emoji-linter diff <files>` | Preview changes without modifying |
| `emoji-linter list <files>` | List files containing emojis |
| `emoji-linter install-hook` | Install git pre-commit hook |

### Options

- `--format <type>` - Output format: table, json, minimal
- `--backup` - Create .bak files before fixing
- `--staged` - Check only git staged files (check mode)
- `--config <path>` - Custom config file
- `--quiet` - Minimal output
- `--verbose` - Detailed output

## GitHub Action Modes

### Clean Mode (Default)
Detects emojis in your codebase for cleanup:
```yaml
- uses: emily-flambe/emoji-linter@v1
  with:
    mode: clean
    path: src/
```

### Forbid Mode
Fails if any emojis are found:
```yaml
- uses: emily-flambe/emoji-linter@v1
  with:
    mode: forbid
```


### Action Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `mode` | clean or forbid | `clean` |
| `path` | Directory to scan | `.` |
| `config-file` | Config file path | `.emoji-linter.config.json` |
| `comment-pr` | Post results to PR | `false` |
| `fail-on-error` | Fail action on violations | `true` |

## Configuration

Create `.emoji-linter.config.json` in your project root to customize behavior. The linter will look for this file automatically, or you can specify a custom path with `--config`.

### Setting Up Configuration

1. **Create the config file** in your project root:
   ```bash
   touch .emoji-linter.config.json
   ```

2. **Add your configuration** (start with this minimal example):
   ```json
   {
     "ignore": {
       "files": ["**/*.md", "**/node_modules/**"]
     }
   }
   ```

3. **Full configuration example** with all options:
   ```json
   {
     "ignore": {
       "files": [
         "**/*.md",           // Ignore all markdown files
         "docs/**",            // Ignore docs directory
         "**/node_modules/**", // Ignore dependencies
         ".git/**",            // Ignore git directory
         "dist/**",            // Ignore build output
         "build/**",           // Ignore build directory
         "coverage/**",        // Ignore test coverage
         "**/*.min.js",        // Ignore minified files
         "**/*.map"            // Ignore source maps
       ],
       "emojis": ["✅", "🚀", "⚠️"]   // Whitelist specific emojis
     },
     "output": {
       "format": "table"         // Output format: table, json, minimal
     }
   }
   ```

### Configuration Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `ignore.files` | File/directory patterns to skip (glob patterns) | `[]` | `["**/*.md", "docs/**"]` |
| `ignore.emojis` | Specific emojis to whitelist (never lint) | `[]` | `["✅", "🚀", "⚠️"]` |
| `output.format` | Output format for CLI | `"table"` | `"json"` |

### Common Configuration Patterns

**For JavaScript/TypeScript projects:**
```json
{
  "ignore": {
    "files": [
      "**/*.md",
      "**/node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "**/*.min.js"
    ]
  }
}
```

**For Python projects:**
```json
{
  "ignore": {
    "files": [
      "**/*.md",
      "**/__pycache__/**",
      "**/venv/**",
      "**/.venv/**",
      "**/*.pyc"
    ]
  }
}
```

**Allow specific emojis in comments:**
```json
{
  "ignore": {
    "emojis": ["✅", "❌", "⚠️", "💡", "🐛", "🔥"],
    "patterns": ["//.*", "#.*", "/\\*.*\\*/"]
  }
}
```

## Ignore Comments

Skip specific lines in files:

```javascript
function example() {
  console.log("Debug 🚀"); // emoji-linter-ignore-line
  
  // emoji-linter-ignore-next-line
  const status = "Success! ✨";
}
```

**Note**: File-level ignore comments are not currently supported. Use the `ignore.files` configuration instead.

## ⚠️ Important Note for Users

This tool provides BASIC emoji detection and removal.
If you need:
- Shortcode detection (:rocket:)
- Full Unicode 15.1 support
- Complex sequence handling

Please consider alternative tools or contribute to this project.

## Pre-commit Hook

Automatically check for emojis before each commit:

### Quick Setup
```bash
# Install the pre-commit hook
emoji-linter install-hook

# Now emojis will be checked automatically on commit
git add .
git commit -m "Your message"  # Hook runs automatically
```

### Manual Pre-commit Check
```bash
# Check only staged files for emojis
emoji-linter check --staged
```

### Skip Hook for One Commit
```bash
git commit --no-verify -m "Allow emojis this time"
```

### Uninstall Hook
```bash
rm .git/hooks/pre-commit
```

### Integration with package.json
Add to your `package.json` for team-wide usage:
```json
{
  "scripts": {
    "prepare": "emoji-linter install-hook",
    "pre-commit": "emoji-linter check --staged"
  }
}
```

### Integration with Husky
If you're using Husky for git hooks:
```bash
npx husky add .husky/pre-commit "emoji-linter check --staged"
```

### Integration with lint-staged
Add to your `.lintstagedrc` or `package.json`:
```json
{
  "*.{js,jsx,ts,tsx}": ["emoji-linter check"]
}
```

## Examples

### Check Before Commit
```bash
emoji-linter check src/ && git commit -m "Clean code"
```

### Check Staged Files Only
```bash
emoji-linter check --staged
```

### Clean Entire Codebase
```bash
emoji-linter fix --backup .
```

### CI/CD Pipeline
```yaml
name: Lint
on: push

jobs:
  no-emojis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: emily-flambe/emoji-linter@v1
        with:
          mode: forbid
          comment-pr: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Installation

This package is not yet published to npm. To use it:

### Clone and Setup
```bash
git clone https://github.com/emilycogsdill/emoji-linter.git
cd emoji-linter
npm install
npm run build
```

### Global CLI
```bash
npm link  # Makes emoji-linter command available globally
```

### Local Development
```bash
npm install --save-dev ./path/to/emoji-linter
```

### GitHub Action
```yaml
uses: emily-flambe/emoji-linter@v1
```

## License

MIT

## Contributing

PRs welcome! Please ensure all tests pass:
```bash
npm test
npm run lint
npm run build
```