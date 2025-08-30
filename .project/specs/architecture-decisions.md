# Architecture Decision Records (ADRs)

## ADR-001: Use Node.js for GitHub Action Implementation

### Status
Accepted

### Context
GitHub Actions can be implemented in JavaScript, TypeScript, Docker, or composite actions.

### Decision
Use Node.js (JavaScript) with the official @actions toolkit.

### Consequences
- **Pros**: Fast startup, native GitHub Actions support, excellent ecosystem
- **Cons**: Must bundle dependencies, limited to Node.js runtime

---

## ADR-002: Bundle with @vercel/ncc

### Status
Accepted

### Context
GitHub Actions require all dependencies to be available at runtime. Options include committing node_modules or bundling.

### Decision
Use @vercel/ncc to create a single bundled file in dist/index.js.

### Consequences
- **Pros**: Single file distribution, smaller repo size, faster action startup
- **Cons**: Must rebuild on every change, debugging can be harder

---

## ADR-003: Emoji Detection Strategy

### Status
Accepted

### Context
Need to detect various emoji formats: Unicode, sequences, shortcodes, with modifiers.

### Decision
Use dual approach:
1. Unicode property escapes for modern Node.js
2. Fallback regex ranges for compatibility
3. Separate shortcode detection

### Implementation
```javascript
// Primary: Unicode properties (Node 10+)
const EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu;

// Fallback: Explicit ranges
const EMOJI_FALLBACK = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;

// Shortcodes
const SHORTCODE_REGEX = /:[a-zA-Z0-9_+-]+:/g;
```

### Consequences
- **Pros**: Comprehensive detection, future-proof, handles all emoji types
- **Cons**: Complex regex, potential performance impact on large texts

---

## ADR-004: Configuration Through Action Inputs

### Status
Accepted

### Context
Need flexible configuration for different use cases.

### Decision
Use action.yml inputs for all configuration with sensible defaults.

### Consequences
- **Pros**: Standard GitHub Actions pattern, type-safe, documented
- **Cons**: Cannot change config at runtime, limited to string inputs

---

## ADR-005: Modular Code Architecture

### Status
Accepted

### Context
Need maintainable, testable code structure.

### Decision
Separate concerns into modules:
- `index.js` - GitHub Actions entry point
- `linter.js` - Core linting logic
- `utils.js` - Helper functions
- `constants.js` - Regex patterns and constants

### Consequences
- **Pros**: Testable units, clear responsibilities, easier maintenance
- **Cons**: More files to manage, must handle imports correctly

---

## ADR-006: Testing Strategy

### Status
Accepted

### Context
Need comprehensive testing for reliability.

### Decision
Three-tier testing approach:
1. Unit tests with Jest
2. Integration tests with mocked GitHub context
3. E2E tests with actual GitHub workflows

### Consequences
- **Pros**: High confidence, catches different types of bugs
- **Cons**: More complex test setup, longer CI runs

---

## ADR-007: Error Handling Philosophy

### Status
Accepted

### Context
Actions can fail silently or explicitly.

### Decision
Fail fast with clear error messages using `core.setFailed()`.

### Implementation
```javascript
try {
  // Action logic
} catch (error) {
  core.setFailed(`Action failed: ${error.message}`);
  core.debug(error.stack);
}
```

### Consequences
- **Pros**: Clear failure reasons, easier debugging
- **Cons**: May fail on non-critical issues

---

## ADR-008: PR Comment Strategy

### Status
Accepted

### Context
Need to provide feedback on PR validation failures.

### Decision
Post comments by default, make it configurable via input.

### Consequences
- **Pros**: Immediate feedback, clear guidance for users
- **Cons**: Can create comment noise, requires write permissions

---

## ADR-009: Validation Modes

### Status
Accepted

### Context
Different projects have different emoji requirements.

### Decision
Implement three modes:
1. **require** - Must have emojis
2. **forbid** - Must not have emojis  
3. **count** - Must have specific range

### Consequences
- **Pros**: Flexible for different workflows, covers all use cases
- **Cons**: More complex validation logic, more tests needed

---

## ADR-010: Position Requirements

### Status
Accepted

### Context
Some workflows require emojis in specific positions.

### Decision
Support three position options:
1. **anywhere** - Emoji can be anywhere (default)
2. **start** - Must be at the beginning
3. **end** - Must be at the end

### Implementation
```javascript
switch(position) {
  case 'start':
    return text.match(/^(\p{Emoji}|\[[^\]]+\])/u);
  case 'end':
    return text.match(/(\p{Emoji}|\[[^\]]+\])$/u);
  default:
    return findAllEmojis(text);
}
```

### Consequences
- **Pros**: Supports Gitmoji and similar conventions
- **Cons**: Additional complexity in validation

---

## ADR-011: Output Format

### Status
Accepted

### Context
Actions need to provide outputs for workflow use.

### Decision
Provide structured outputs:
- `passed` - Boolean result
- `emoji-count` - Number found
- `message` - Human-readable message

### Consequences
- **Pros**: Enables conditional workflows, clear results
- **Cons**: Must maintain output compatibility

---

## ADR-012: Version Strategy

### Status
Accepted

### Context
GitHub Actions are versioned via Git tags.

### Decision
Use semantic versioning with major version tags:
- Full versions: `v1.0.0`, `v1.0.1`
- Major versions: `v1`, `v2`
- Latest: `main` branch

### Consequences
- **Pros**: Standard GitHub Actions pattern, allows pinning
- **Cons**: Must maintain version tags, breaking changes need major version

---

## ADR-013: Unicode Support Strategy

### Status
Accepted

### Context
JavaScript Unicode support varies by Node version.

### Decision
Runtime detection with graceful fallback:
```javascript
function supportsUnicodeProperties() {
  try {
    new RegExp('\\p{Emoji}', 'u');
    return true;
  } catch {
    return false;
  }
}
```

### Consequences
- **Pros**: Works on all Node versions, future-proof
- **Cons**: Complexity in maintaining two regex patterns

---

## ADR-014: Logging Strategy

### Status
Accepted

### Context
Need informative logs without exposing sensitive data.

### Decision
Use @actions/core logging methods:
- `core.info()` - General information
- `core.warning()` - Non-fatal issues
- `core.error()` - Errors
- `core.debug()` - Detailed debugging (hidden by default)
- `core.setSecret()` - Mask sensitive values

### Consequences
- **Pros**: Consistent with GitHub Actions, proper log levels
- **Cons**: Must remember to use core methods, not console.log

---

## ADR-015: Performance Optimization

### Status
Accepted

### Context
Actions should be fast to not slow down CI/CD.

### Decision
Optimize for common cases:
1. Early exit on simple validations
2. Compile regex once and reuse
3. Limit string scanning to reasonable length
4. Cache GitHub API client

### Consequences
- **Pros**: Fast execution, better user experience
- **Cons**: More complex code, premature optimization risk

---

## Future Considerations

### Potential Enhancements
1. **Custom emoji sets**: Load from external files
2. **Emoji categories**: Validate specific types (e.g., only Gitmoji)
3. **Multi-language messages**: Provide localized error messages
4. **Statistics collection**: Track emoji usage patterns
5. **Webhooks**: Send results to external services

### Technical Debt
1. Regex complexity could be reduced with a parsing library
2. Test coverage for exotic emoji sequences
3. Performance benchmarking needed
4. Consider TypeScript for type safety

### Migration Paths
- **To TypeScript**: Would require build step changes
- **To Docker**: Would need container setup
- **To composite action**: Could simplify distribution