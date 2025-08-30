# emoji-linter

Remove emojis from your codebase. Keep your code professional.

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
| `emoji-linter fix <files>` | Remove emojis from files |
| `emoji-linter diff <files>` | Preview changes without modifying |
| `emoji-linter list <files>` | List files containing emojis |

### Options

- `--format <type>` - Output format: table, json, minimal
- `--backup` - Create .bak files before fixing
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

### Require Mode
Fails if NO emojis are found (useful for commit messages):
```yaml
- uses: emily-flambe/emoji-linter@v1
  with:
    mode: require
```

### Action Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `mode` | clean, forbid, or require | `clean` |
| `path` | Directory to scan | `.` |
| `config-file` | Config file path | `.emoji-linter.json` |
| `comment-pr` | Post results to PR | `false` |
| `fail-on-error` | Fail action on violations | `true` |

## Configuration

Create `.emoji-linter.json` in your project root:

```json
{
  "ignore": {
    "files": [
      "**/*.md",
      "docs/**",
      "**/node_modules/**"
    ],
    "emojis": []
  },
  "detection": {
    "unicode": true,
    "shortcodes": true
  }
}
```

## Ignore Comments

Skip specific lines or files:

```javascript
// emoji-linter-ignore-file
// This entire file will be skipped

function example() {
  console.log("Debug"); // emoji-linter-ignore-line
  
  // emoji-linter-ignore-next-line
  const status = "Success!";
}
```

## What It Detects

- Unicode emojis: 🚀 ✨ 😀
- Shortcodes: :rocket: :sparkles:
- Sequences: 👨‍💻 🏳️‍🌈
- Skin tones: 👋🏻 👋🏿
- Flags: 🇺🇸 🇬🇧

## Examples

### Check Before Commit
```bash
emoji-linter check src/ && git commit -m "Clean code"
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