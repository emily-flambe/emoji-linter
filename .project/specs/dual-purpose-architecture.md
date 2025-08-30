# Dual-Purpose Architecture Specification

## Overview
emoji-linter is designed as a dual-purpose tool combining CLI linting capabilities with GitHub Action integration.

## Architecture Components

### 1. CLI Tool (`emoji-linter` command)
Primary mode for codebase cleaning and maintenance.

**Usage Patterns**:
```bash
# Check for emojis (exit code 1 if found)
emoji-linter --check src/

# Remove emojis in-place
emoji-linter --fix src/ tests/

# Preview changes
emoji-linter --diff src/

# List all emojis found
emoji-linter --list . --format json
```

**Core Features**:
- Recursive file system scanning
- In-place emoji removal with backup options
- Multiple output formats (table, JSON, minimal)
- Comprehensive ignore system
- Performance optimized for large codebases

### 2. GitHub Action Integration
Secondary mode for CI/CD validation workflows.

**Usage Patterns**:
```yaml
# Validate no emojis in codebase
- uses: ./emoji-linter@v1
  with:
    mode: clean
    check-only: true
    
# Clean emojis and commit changes
- uses: ./emoji-linter@v1 
  with:
    mode: clean
    auto-commit: true
```

## Directory Structure

```
emoji-linter/
├── bin/
│   └── emoji-linter.js       # CLI executable entry point
├── src/
│   ├── cli.js                # CLI implementation
│   ├── action.js             # GitHub Action wrapper
│   ├── core/
│   │   ├── detector.js       # Emoji detection engine
│   │   ├── scanner.js        # File system scanner
│   │   ├── cleaner.js        # Emoji removal logic
│   │   └── config.js         # Configuration management
│   └── utils/
│       ├── patterns.js       # Comprehensive regex patterns
│       ├── ignore.js         # Ignore logic (files/lines)
│       └── output.js         # Formatting utilities
├── dist/
│   └── index.js              # Bundled GitHub Action
├── tests/
│   ├── cli.test.js           # CLI integration tests
│   ├── action.test.js        # GitHub Action tests
│   └── fixtures/             # Test data and sample files
├── .emoji-linter.json        # Default configuration
├── action.yml                # GitHub Action metadata
└── package.json              # npm package + GitHub Action
```

## Configuration System

### Config File (`.emoji-linter.json`)
```json
{
  "ignore": {
    "files": [
      "**/*.md",
      "docs/**", 
      "test/fixtures/**",
      "**/node_modules/**"
    ],
    "emojis": ["✨", "🚀"],
    "patterns": ["console.log.*🚀"]
  },
  "detection": {
    "unicode": true,
    "shortcodes": true,
    "sequences": true,
    "skinTones": true
  },
  "output": {
    "format": "table",
    "showContext": true,
    "maxContextLines": 2
  },
  "cleanup": {
    "preserveWhitespace": false,
    "createBackup": true
  }
}
```

### Inline Ignore Comments
```javascript
// emoji-linter-ignore-file
// This entire file will be ignored

function example() {
  console.log("Debug message 🚀"); // emoji-linter-ignore-line
  
  // emoji-linter-ignore-next-line
  const status = "Success ✅";
}
```

## Detection Engine

### Comprehensive Emoji Support
- **Unicode Emojis**: All Unicode 15.1 emoji characters
- **Emoji Sequences**: Multi-codepoint emojis (👨‍💻, 🏳️‍🌈)  
- **Skin Tone Modifiers**: All Fitzpatrick scale variations
- **Shortcode Emojis**: GitHub/Slack style `:rocket:`
- **Regional Indicators**: Flag emojis
- **ZWJ Sequences**: Zero-width joiner combinations

### Performance Optimizations
- Lazy regex compilation
- Streaming file processing
- Parallel directory scanning
- Binary file detection and skipping
- Memory-efficient large file handling

## Command Line Interface

### Primary Commands
```bash
emoji-linter [files/dirs] [options]
```

### Options
| Option | Description | Default |
|--------|-------------|---------|
| `--check` | Check only, don't modify files | false |
| `--fix` | Remove emojis in-place | false |
| `--diff` | Show what would be changed | false |
| `--list` | List all emojis found | false |
| `--config <path>` | Configuration file path | `.emoji-linter.json` |
| `--ignore-config` | Skip configuration file | false |
| `--format <fmt>` | Output format (table/json/minimal) | `table` |
| `--include <pattern>` | Include files matching pattern | `**/*` |
| `--exclude <pattern>` | Exclude files matching pattern | - |
| `--backup` | Create backup files (.bak) | false |
| `--quiet` | Minimal output | false |
| `--verbose` | Detailed output | false |

### Exit Codes
- `0` - Success, no emojis found or all cleaned
- `1` - Emojis found (in check mode) or errors occurred
- `2` - Invalid arguments or configuration

## GitHub Action Integration

### Action Metadata (action.yml)
```yaml
name: 'Emoji Linter'
description: 'Detect and remove emojis from source code'
author: 'Emily Cogsdill'

branding:
  icon: 'eye-off'
  color: 'gray-dark'

inputs:
  mode:
    description: 'clean, require, forbid'
    required: false
    default: 'clean'
  check-only:
    description: 'Check without modifying files'
    required: false
    default: 'true'
  files:
    description: 'Files or directories to scan'
    required: false
    default: '.'
  config-file:
    description: 'Path to configuration file'
    required: false
    default: '.emoji-linter.json'
  auto-commit:
    description: 'Auto-commit cleaned files'
    required: false
    default: 'false'

outputs:
  emojis-found:
    description: 'Number of emojis detected'
  files-modified:
    description: 'Number of files modified'
  summary:
    description: 'Summary of changes made'

runs:
  using: 'node20'
  main: 'dist/index.js'
```

### Workflow Examples
```yaml
# Check codebase for emojis in CI
name: Lint Code
on: [push, pull_request]
jobs:
  emoji-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./emoji-linter@v1
        with:
          mode: clean
          check-only: true
          
# Auto-clean emojis on main branch
name: Clean Emojis
on:
  push:
    branches: [main]
jobs:
  clean:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./emoji-linter@v1
        with:
          mode: clean
          auto-commit: true
          commit-message: "Remove emojis from codebase [skip ci]"
```

## Distribution Strategy

### npm Package
- **Package Name**: `emoji-linter`
- **CLI Binary**: `emoji-linter` command
- **Programmatic API**: `require('emoji-linter')`
- **Target Audience**: Developers, CI/CD pipelines

### GitHub Action
- **Marketplace Name**: "Emoji Linter" 
- **Repository**: Public GitHub repository
- **Distribution**: GitHub releases with bundled dist/
- **Target Audience**: GitHub workflow users

## Development Workflow

### CLI Development
```bash
# Install dependencies
npm install

# Run CLI locally
node bin/emoji-linter.js --check src/

# Run tests
npm test

# Build for distribution
npm run build
```

### Action Development
```bash
# Bundle for GitHub Actions
npm run build:action

# Test action locally
act push -j test-action

# Test with different inputs
act push -j test-action --input mode=clean
```

## Testing Strategy

### Unit Tests
- Emoji detection accuracy
- Configuration parsing
- File system operations  
- Ignore logic validation

### Integration Tests
- CLI command execution
- GitHub Action workflows
- Large codebase performance
- Error handling scenarios

### End-to-End Tests
- Real repository scanning
- GitHub Actions workflow validation
- Cross-platform compatibility
- Performance benchmarking