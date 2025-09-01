# 📋 Emoji Linter - Complete Project Specification

## Project Overview
**Name:** emoji-linter
**Type:** GitHub Action
**Purpose:** A GitHub Action that validates emoji usage in commit messages, PR titles, PR descriptions, and branch names
**Distribution:** Public GitHub repository (marketplace-ready)

## 📁 Repository Structure
```
emoji-linter/
├── .github/
│   └── workflows/
│       ├── test.yml           # Test the action on the repo itself
│       └── release.yml        # Auto-release workflow
├── src/
│   ├── index.js              # Main action code
│   ├── linter.js             # Core linting logic
│   └── utils.js              # Helper functions
├── dist/
│   └── index.js              # Compiled/bundled action code
├── tests/
│   ├── linter.test.js        # Unit tests
│   └── fixtures/             # Test fixtures
├── action.yml                # Action metadata (REQUIRED)
├── package.json              # Node.js dependencies
├── package-lock.json         # Lock file
├── .gitignore               # Git ignore file
├── LICENSE                  # MIT License
└── README.md                # Documentation
```

## 🎯 Core Features

### 1. Linting Targets
- **Commit messages** - Validate commit message text
- **PR titles** - Check pull request titles
- **PR body** - Check pull request descriptions
- **Branch names** - Validate branch naming
- **File paths** - Check file names in commits

### 2. Linting Modes
- **require** - Must have emojis (default)
- **forbid** - Must NOT have emojis
- **count** - Must have specific number range

### 3. Validation Rules
- Minimum/maximum emoji count
- Position requirements (start/end/anywhere)
- Allowed emoji whitelist
- Forbidden emoji blacklist
- Custom regex patterns

### 4. Output Options
- Pass/fail status
- PR comments with details
- Check run annotations
- Action outputs for workflow use

## 🔧 Implementation Steps

### Step 1: Initialize Repository
```bash
# Create new repo on GitHub: emoji-linter
git clone https://github.com/YOUR_USERNAME/emoji-linter
cd emoji-linter
npm init -y
```

### Step 2: Install Dependencies
```bash
npm install @actions/core @actions/github @vercel/ncc --save
npm install jest eslint --save-dev
```

### Step 3: Create action.yml
```yaml
name: 'Emoji Linter'
description: 'Validate emoji usage in commits, PRs, and branches'
author: 'YOUR_NAME'

branding:
  icon: 'check-circle'
  color: 'yellow'

inputs:
  mode:
    description: 'require, forbid, or count'
    required: false
    default: 'require'

  target:
    description: 'commit, pr-title, pr-body, branch, or files'
    required: false
    default: 'pr-title'

  min-emojis:
    description: 'Minimum emojis required'
    required: false
    default: '1'

  max-emojis:
    description: 'Maximum emojis allowed'
    required: false
    default: ''

  position:
    description: 'anywhere, start, or end'
    required: false
    default: 'anywhere'

  allowed-emojis:
    description: 'Comma-separated allowed emojis'
    required: false
    default: ''

  forbidden-emojis:
    description: 'Comma-separated forbidden emojis'
    required: false
    default: ''

  comment-on-pr:
    description: 'Post results as PR comment'
    required: false
    default: 'true'

  fail-on-error:
    description: 'Fail action on violations'
    required: false
    default: 'true'

  github-token:
    description: 'GitHub token for API'
    required: false
    default: ${{ github.token }}

outputs:
  passed:
    description: 'Whether validation passed'
  emoji-count:
    description: 'Number of emojis found'
  message:
    description: 'Result message'

runs:
  using: 'node20'
  main: 'dist/index.js'
```

### Step 4: Create Core Files

#### src/linter.js
```javascript
// Emoji detection regex patterns
const EMOJI_REGEX = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
const SHORTCODE_REGEX = /:[a-zA-Z0-9_+-]+:/g;

class EmojiLinter {
  constructor(options) {
    this.options = options;
  }

  lint(text) {
    const emojis = this.findEmojis(text);
    const count = emojis.length;

    // Validate based on mode
    let passed = false;
    let message = '';

    switch (this.options.mode) {
      case 'require':
        passed = count >= this.options.minEmojis;
        message = passed
          ? `✅ Found ${count} emoji(s)`
          : `❌ Expected at least ${this.options.minEmojis} emoji(s), found ${count}`;
        break;
      case 'forbid':
        passed = count === 0;
        message = passed
          ? `✅ No emojis found`
          : `❌ Emojis are not allowed, found ${count}`;
        break;
      case 'count':
        passed = count >= this.options.minEmojis &&
                 (!this.options.maxEmojis || count <= this.options.maxEmojis);
        message = passed
          ? `✅ Found ${count} emoji(s)`
          : `❌ Expected ${this.options.minEmojis}-${this.options.maxEmojis} emoji(s), found ${count}`;
        break;
    }

    return { passed, count, message, emojis };
  }

  findEmojis(text) {
    const emojis = [];
    const unicodeMatches = text.match(EMOJI_REGEX) || [];
    const shortcodeMatches = text.match(SHORTCODE_REGEX) || [];
    return [...unicodeMatches, ...shortcodeMatches];
  }
}

module.exports = EmojiLinter;
```

#### src/index.js
```javascript
const core = require('@actions/core');
const github = require('@actions/github');
const EmojiLinter = require('./linter');

async function run() {
  try {
    // Parse inputs
    const options = {
      mode: core.getInput('mode'),
      target: core.getInput('target'),
      minEmojis: parseInt(core.getInput('min-emojis')),
      maxEmojis: core.getInput('max-emojis') ? parseInt(core.getInput('max-emojis')) : null,
      position: core.getInput('position'),
      allowedEmojis: core.getInput('allowed-emojis').split(',').filter(Boolean),
      forbiddenEmojis: core.getInput('forbidden-emojis').split(',').filter(Boolean),
      commentOnPr: core.getInput('comment-on-pr') === 'true',
      failOnError: core.getInput('fail-on-error') === 'true',
      token: core.getInput('github-token')
    };

    // Get text to lint
    const context = github.context;
    let textToLint = '';
    let targetName = '';

    switch (options.target) {
      case 'commit':
        textToLint = context.payload.head_commit?.message || '';
        targetName = 'Commit message';
        break;
      case 'pr-title':
        textToLint = context.payload.pull_request?.title || '';
        targetName = 'PR title';
        break;
      case 'pr-body':
        textToLint = context.payload.pull_request?.body || '';
        targetName = 'PR body';
        break;
      case 'branch':
        textToLint = context.payload.pull_request?.head?.ref || context.ref.replace('refs/heads/', '');
        targetName = 'Branch name';
        break;
    }

    // Run linter
    const linter = new EmojiLinter(options);
    const result = linter.lint(textToLint);

    // Set outputs
    core.setOutput('passed', result.passed);
    core.setOutput('emoji-count', result.count);
    core.setOutput('message', result.message);

    // Log result
    core.info(`${targetName}: ${textToLint}`);
    core.info(result.message);

    // Comment on PR if enabled
    if (options.commentOnPr && context.payload.pull_request && !result.passed) {
      const octokit = github.getOctokit(options.token);
      await octokit.rest.issues.createComment({
        ...context.repo,
        issue_number: context.payload.pull_request.number,
        body: `## Emoji Linter Results\n\n${result.message}\n\n**Target:** ${targetName}\n**Text:** ${textToLint}`
      });
    }

    // Fail if needed
    if (!result.passed && options.failOnError) {
      core.setFailed(result.message);
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
```

### Step 5: Create package.json
```json
{
  "name": "emoji-linter",
  "version": "1.0.0",
  "description": "GitHub Action to lint emoji usage",
  "main": "src/index.js",
  "scripts": {
    "build": "ncc build src/index.js -o dist",
    "test": "jest",
    "lint": "eslint src/",
    "prepare": "npm run build"
  },
  "keywords": ["github-action", "emoji", "linter"],
  "author": "YOUR_NAME",
  "license": "MIT",
  "dependencies": {
    "@actions/core": "^1.10.0",
    "@actions/github": "^6.0.0"
  },
  "devDependencies": {
    "@vercel/ncc": "^0.38.0",
    "eslint": "^8.0.0",
    "jest": "^29.0.0"
  }
}
```

### Step 6: Create Test Workflow
**.github/workflows/test.yml**
```yaml
name: Test Action
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test-require:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./
        with:
          mode: require
          target: pr-title
          min-emojis: 1

  test-forbid:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./
        with:
          mode: forbid
          target: branch
          fail-on-error: false
```

### Step 7: Create README.md
```markdown
# 🎯 Emoji Linter GitHub Action

Enforce emoji standards in your GitHub workflow!

## Usage

### Basic Example
\```yaml
name: Lint PR
on:
  pull_request:
    types: [opened, edited]

jobs:
  emoji-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: YOUR_USERNAME/emoji-linter@v1
        with:
          mode: require
          target: pr-title
          min-emojis: 1
\```

### Advanced Example
\```yaml
- uses: YOUR_USERNAME/emoji-linter@v1
  with:
    mode: count
    target: commit
    min-emojis: 1
    max-emojis: 3
    position: start
    allowed-emojis: ✨,🐛,📝,🚀
    comment-on-pr: true
\```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| mode | require, forbid, or count | require |
| target | What to lint | pr-title |
| min-emojis | Minimum required | 1 |
| max-emojis | Maximum allowed | - |
| position | anywhere, start, end | anywhere |
| allowed-emojis | Whitelist | - |
| forbidden-emojis | Blacklist | - |
| comment-on-pr | Post PR comment | true |
| fail-on-error | Fail on violations | true |

## Examples

### Require Gitmoji in commits
\```yaml
- uses: YOUR_USERNAME/emoji-linter@v1
  with:
    target: commit
    allowed-emojis: ✨,🐛,📝,🚀,✅,🔧
\```

### Forbid emojis in branch names
\```yaml
- uses: YOUR_USERNAME/emoji-linter@v1
  with:
    mode: forbid
    target: branch
\```
```

### Step 8: Build & Commit
```bash
# Install dependencies
npm install

# Build the action
npm run build

# Commit everything
git add .
git commit -m "✨ Initial emoji-linter action"
git push origin main
```

### Step 9: Create Release
1. Go to GitHub repo → Releases → Create new release
2. Create tag: `v1.0.0`
3. Release title: `v1.0.0 - Initial Release`
4. Auto-generate release notes
5. Publish release

### Step 10: Submit to Marketplace
1. Go to repo → Settings → Pages (optional for docs)
2. Go to repo main page → "Publish this Action to Marketplace" banner
3. Follow prompts to publish

## 🚀 Usage in Other Repositories

Once published, others can use:
```yaml
- uses: YOUR_USERNAME/emoji-linter@v1
  with:
    mode: require
    target: pr-title
```

## 📝 Testing Locally

```bash
# Install act (GitHub Actions local runner)
brew install act  # or your package manager

# Test the action
act pull_request -e tests/fixtures/pr-event.json
```

## 🔑 Key Files to Create

### .gitignore
```
node_modules/
*.log
.DS_Store
coverage/
.env
```

### LICENSE (MIT)
```
MIT License

Copyright (c) 2024 YOUR_NAME

Permission is hereby granted, free of charge...
```

### tests/linter.test.js
```javascript
const EmojiLinter = require('../src/linter');

describe('EmojiLinter', () => {
  test('requires emoji when mode is require', () => {
    const linter = new EmojiLinter({ mode: 'require', minEmojis: 1 });

    expect(linter.lint('No emoji').passed).toBe(false);
    expect(linter.lint('✨ With emoji').passed).toBe(true);
  });

  test('forbids emoji when mode is forbid', () => {
    const linter = new EmojiLinter({ mode: 'forbid' });

    expect(linter.lint('No emoji').passed).toBe(true);
    expect(linter.lint('✨ With emoji').passed).toBe(false);
  });
});
```

## 🎯 Success Criteria

Your action is ready when:
1. ✅ `npm run build` creates `dist/index.js`
2. ✅ Tests pass with `npm test`
3. ✅ Action works in test workflow
4. ✅ Published to GitHub with tag
5. ✅ Appears in GitHub Marketplace
6. ✅ Others can use `uses: YOUR_USERNAME/emoji-linter@v1`

## 📊 Maintenance

### Version Updates
```bash
# Make changes
npm run build
git add .
git commit -m "🐛 Fix bug"
git push

# Create new release
git tag v1.0.1
git push --tags
# Then create release on GitHub
```

### Marketplace Updates
- Description updates: Edit action.yml
- Icon/color changes: Edit branding in action.yml
- Push changes and they auto-update

## 🔗 Distribution Model

**No package registry needed!** GitHub Actions are distributed via:
1. **GitHub repository** - Your public repo IS the distribution
2. **Marketplace listing** - Optional, for discoverability
3. **Version tags** - Users pin to versions via Git tags
4. **Direct reference** - `uses: username/repo@version`

This is fundamentally different from npm/PyPI - the GitHub repo itself is both the source and distribution mechanism!
