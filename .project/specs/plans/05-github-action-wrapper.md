# Plan 05: GitHub Action Wrapper

## Scope
Create GitHub Action wrapper around the CLI tool for CI/CD integration.

## Dependencies
- **Requires**: Plans 01-04 (CLI tool fully functional)
- **Provides**: Complete dual-purpose tool ready for distribution

## Objectives
- Wrap CLI functionality for GitHub Actions environment
- Handle GitHub context (PR events, commits, etc.)
- Provide GitHub-native outputs and PR comments
- Bundle for GitHub Actions distribution
- Maintain compatibility with existing GitHub workflow patterns

## Deliverables

### 1. GitHub Action Entry Point (`src/action.js`)
```javascript
// GitHub Action wrapper that uses CLI implementation
async function run() {
  // Parse GitHub Action inputs
  // Call CLI functionality  
  // Handle GitHub-specific outputs
}
```

### 2. Action Metadata (`action.yml`)
```yaml
name: 'Emoji Linter'
description: 'Detect and remove emojis from source code'
# Complete action specification
```

### 3. Build System (`scripts/build-action.js`)
```javascript
// Bundle action for GitHub distribution using @vercel/ncc
```

### 4. GitHub Integration Utils (`src/utils/github.js`)  
```javascript
const GitHubUtils = {
  parseContext(),        // Parse GitHub context
  createPRComment(),     // Post PR comments
  setCheckRun(),        // Create check runs
  uploadArtifacts()     // Upload artifacts
}
```

## Implementation Steps

### Step 1: GitHub Action Inputs/Outputs Design
```yaml
# action.yml
name: 'Emoji Linter'
description: 'Detect and remove emojis from source code'
author: 'Emily Cogsdill'

branding:
  icon: 'eye-off'
  color: 'gray-dark'

inputs:
  mode:
    description: 'clean (default), require, forbid'
    required: false
    default: 'clean'
    
  check-only:
    description: 'Check without modifying files (true/false)'
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
    
  format:
    description: 'Output format (table, json, minimal)'
    required: false
    default: 'table'
    
  comment-on-pr:
    description: 'Post results as PR comment (true/false)'
    required: false
    default: 'true'
    
  fail-on-found:
    description: 'Fail action when emojis found (true/false)'
    required: false
    default: 'true'
    
  github-token:
    description: 'GitHub token for API operations'
    required: false
    default: ${{ github.token }}

outputs:
  emojis-found:
    description: 'Total number of emojis detected'
    
  files-with-emojis:
    description: 'Number of files containing emojis'
    
  files-modified:
    description: 'Number of files modified (fix mode only)'
    
  summary:
    description: 'JSON summary of results'
    
  passed:
    description: 'Whether validation passed (true/false)'

runs:
  using: 'node20'
  main: 'dist/index.js'
```

### Step 2: GitHub Action Implementation
```javascript
const core = require('@actions/core');
const github = require('@actions/github');
const { CLI } = require('./cli');
const { GitHubUtils } = require('./utils/github');

async function run() {
  try {
    // Parse inputs
    const inputs = {
      mode: core.getInput('mode') || 'clean',
      checkOnly: core.getBooleanInput('check-only'),
      files: core.getInput('files') || '.',
      configFile: core.getInput('config-file'),
      format: core.getInput('format') || 'table',
      commentOnPR: core.getBooleanInput('comment-on-pr'),
      failOnFound: core.getBooleanInput('fail-on-found'),
      token: core.getInput('github-token')
    };

    core.info(`Running emoji-linter in ${inputs.mode} mode`);
    core.info(`Scanning: ${inputs.files}`);

    // Initialize CLI
    const cli = new CLI();
    
    // Convert GitHub Action inputs to CLI options
    const cliOptions = {
      check: inputs.checkOnly || inputs.mode === 'clean',
      fix: !inputs.checkOnly && inputs.mode === 'clean',
      config: inputs.configFile,
      format: 'json' // Always use JSON for programmatic processing
    };

    // Run CLI tool
    const results = await cli.runAndGetResults(inputs.files.split(' '), cliOptions);

    // Process results
    await processResults(results, inputs);

    // Set outputs
    core.setOutput('emojis-found', results.totalEmojis);
    core.setOutput('files-with-emojis', results.filesWithEmojis);  
    core.setOutput('files-modified', results.filesModified || 0);
    core.setOutput('summary', JSON.stringify(results));
    core.setOutput('passed', results.totalEmojis === 0);

    // Handle failure
    if (results.totalEmojis > 0 && inputs.failOnFound) {
      core.setFailed(`Found ${results.totalEmojis} emojis across ${results.filesWithEmojis} files`);
    } else if (results.totalEmojis > 0) {
      core.warning(`Found ${results.totalEmojis} emojis across ${results.filesWithEmojis} files`);
    } else {
      core.info('No emojis found - validation passed');
    }

  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
    
    if (error.stack) {
      core.debug(error.stack);
    }
  }
}

async function processResults(results, inputs) {
  // Handle different modes
  switch (inputs.mode) {
    case 'clean':
      await handleCleanMode(results, inputs);
      break;
    case 'require':
      await handleRequireMode(results, inputs);
      break;  
    case 'forbid':
      await handleForbidMode(results, inputs);
      break;
  }

  // Post PR comment if requested
  if (inputs.commentOnPR && github.context.payload.pull_request) {
    await postPRComment(results, inputs);
  }
}
```

### Step 3: GitHub-Specific Functionality
```javascript
const GitHubUtils = {
  async postPRComment(results, token) {
    const context = github.context;
    const octokit = github.getOctokit(token);

    if (!context.payload.pull_request) {
      core.warning('Not a pull request context - skipping comment');
      return;
    }

    const comment = this.formatPRComment(results);
    
    try {
      await octokit.rest.issues.createComment({
        ...context.repo,
        issue_number: context.payload.pull_request.number,
        body: comment
      });
      
      core.info('Posted results as PR comment');
    } catch (error) {
      core.warning(`Failed to post PR comment: ${error.message}`);
    }
  },

  formatPRComment(results) {
    if (results.totalEmojis === 0) {
      return '✅ **Emoji Linter**: No emojis found in codebase';
    }

    const files = results.results.reduce((acc, result) => {
      if (!acc[result.file]) acc[result.file] = [];
      acc[result.file].push(result);
      return acc;
    }, {});

    let comment = `## 🚨 Emoji Linter Results\n\n`;
    comment += `Found **${results.totalEmojis} emojis** across **${results.filesWithEmojis} files**\n\n`;

    Object.entries(files).forEach(([file, emojis]) => {
      comment += `### \`${file}\`\n`;
      emojis.forEach(emoji => {
        comment += `- Line ${emoji.line}: \`${emoji.emoji}\` - ${emoji.context}\n`;
      });
      comment += '\n';
    });

    comment += '---\n';
    comment += '*Run `npx emoji-linter --fix .` to automatically remove emojis*';

    return comment;
  },

  parseGitHubContext() {
    const context = github.context;
    
    return {
      eventName: context.eventName,
      actor: context.actor,
      repository: context.repo,
      pullRequest: context.payload.pull_request,
      commit: context.payload.head_commit,
      ref: context.ref
    };
  }
};
```

### Step 4: Build System for GitHub Actions
```javascript
// scripts/build-action.js
const ncc = require('@vercel/ncc');
const fs = require('fs').promises;
const path = require('path');

async function buildAction() {
  console.log('Building GitHub Action...');

  // Bundle the action
  const result = await ncc(path.join(__dirname, '../src/action.js'), {
    minify: true,
    sourceMap: true,
    externals: ['@actions/core', '@actions/github']
  });

  // Write bundled file
  await fs.writeFile('dist/index.js', result.code);
  
  if (result.map) {
    await fs.writeFile('dist/index.js.map', result.map);
  }

  console.log('GitHub Action built successfully');
  console.log(`Bundle size: ${Math.round(result.code.length / 1024)}KB`);
}

buildAction().catch(console.error);
```

### Step 5: Integration with CLI
```javascript
// Extend CLI class to support GitHub Actions
class CLI {
  // ... existing methods ...

  async runAndGetResults(files, options) {
    // Run CLI and capture results instead of outputting
    const results = [];
    let filesModified = 0;

    // ... CLI logic but collect results ...

    return {
      totalEmojis: results.length,
      filesWithEmojis: new Set(results.map(r => r.file)).size,
      filesModified,
      results,
      duration: Date.now() - startTime
    };
  }

  // GitHub Action specific modes
  async requireMode(files, options) {
    const results = await this.runAndGetResults(files, { ...options, check: true });
    return {
      passed: results.totalEmojis > 0,
      message: results.totalEmojis > 0 
        ? `Found required emojis: ${results.totalEmojis}`
        : 'No emojis found - requirement not met',
      ...results
    };
  }

  async forbidMode(files, options) {
    const results = await this.runAndGetResults(files, { ...options, check: true });
    return {
      passed: results.totalEmojis === 0,
      message: results.totalEmojis === 0 
        ? 'No emojis found - validation passed'
        : `Found forbidden emojis: ${results.totalEmojis}`,
      ...results
    };
  }
}
```

## Test Strategy

### Unit Tests
```javascript
describe('GitHub Action', () => {
  beforeEach(() => {
    // Mock @actions/core and @actions/github
    jest.mock('@actions/core');
    jest.mock('@actions/github');
  });

  test('sets correct outputs for clean mode', async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'mode': 'clean',
        'check-only': 'true',
        'files': 'src/'
      };
      return inputs[name] || '';
    });

    await run();

    expect(core.setOutput).toHaveBeenCalledWith('emojis-found', 2);
    expect(core.setOutput).toHaveBeenCalledWith('passed', false);
  });

  test('posts PR comment when requested', async () => {
    github.context.payload.pull_request = { number: 123 };
    const createComment = jest.fn();
    github.getOctokit.mockReturnValue({
      rest: { issues: { createComment } }
    });

    await GitHubUtils.postPRComment(mockResults, 'token');

    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 123,
        body: expect.stringContaining('Emoji Linter Results')
      })
    );
  });
});
```

### Integration Tests
```javascript
describe('GitHub Action Integration', () => {
  test('works with act (local GitHub Actions runner)', async () => {
    // Test with act tool for local GitHub Actions testing
    const result = await exec('act push -j test-emoji-linter');
    expect(result.exitCode).toBe(0);
  });

  test('handles different GitHub contexts', async () => {
    // Test push events, PR events, etc.
    const contexts = [
      { eventName: 'push' },
      { eventName: 'pull_request' },
      { eventName: 'pull_request', action: 'opened' }
    ];

    for (const context of contexts) {
      github.context = context;
      await expect(run()).resolves.not.toThrow();
    }
  });
});
```

## Workflow Examples

### Basic Usage
```yaml
name: Lint Emojis
on: [push, pull_request]

jobs:
  emoji-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./emoji-linter@v1
        with:
          mode: clean
          check-only: true
```

### Auto-fix Mode
```yaml
name: Clean Emojis
on:
  push:
    branches: [main]

jobs:
  clean:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          
      - uses: ./emoji-linter@v1
        with:
          mode: clean
          check-only: false
          comment-on-pr: false
          
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .
          git diff --staged --quiet || git commit -m "Remove emojis from codebase [skip ci]"
          git push
```

## Success Criteria

### Functional Requirements
- [ ] All CLI modes accessible via GitHub Action
- [ ] Proper GitHub Action inputs/outputs
- [ ] PR comment integration working
- [ ] Bundled distribution under 5MB
- [ ] Compatible with GitHub-hosted and self-hosted runners

### Integration Requirements  
- [ ] Works with existing GitHub workflows
- [ ] Handles all GitHub event types gracefully
- [ ] Provides actionable PR feedback
- [ ] Supports both public and private repositories

### Quality Requirements
- [ ] No external dependencies in bundled action
- [ ] Comprehensive error handling for GitHub API
- [ ] Performance suitable for CI/CD (under 30 seconds)
- [ ] Cross-platform runner compatibility

## Build Process

```bash
# Development
npm run dev:action          # Watch mode for development
npm run test:action         # Test GitHub Action components

# Production build
npm run build:action        # Bundle for distribution
npm run validate:action     # Validate action.yml and bundle

# Local testing  
npm run test:local-action   # Test with act
```

## Definition of Done
- GitHub Action wrapper provides all CLI functionality
- Professional PR comment integration
- Bundled and ready for GitHub Marketplace
- Comprehensive testing including local GitHub Actions testing
- Documentation with workflow examples
- Maintains performance requirements in CI/CD environment