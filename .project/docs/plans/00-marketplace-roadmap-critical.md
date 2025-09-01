# GitHub Marketplace Critical Requirements Only

## Overview
This roadmap contains ONLY the critical blockers that will prevent GitHub Marketplace submission. Everything else has been removed.

## Current State
- **3 Critical Blockers** that MUST be fixed
- **Estimated Time**: 4-6 hours total

## CRITICAL Requirements Only

### Must Fix Before Submission

| Priority | Plan | Issue | Time |
|----------|------|-------|------|
| **BLOCKER 1** | [01-legal-compliance.md](./01-legal-compliance.md) | Missing LICENSE file | 15 minutes |
| **BLOCKER 2** | [02-security-policy.md](./02-security-policy.md) | Missing SECURITY.md | 30 minutes |
| **BLOCKER 3** | [03-test-coverage-critical.md](./03-test-coverage-critical.md) | Coverage below 80% (currently 66.79%) | 3-5 hours |

## That's It

Once these 3 items are complete, the action is ready for GitHub Marketplace submission.

## What We're NOT Doing

These are nice-to-have but NOT required:
- ❌ CLI refactoring (works fine as-is)
- ❌ Example workflows (README examples are sufficient)
- ❌ CONTRIBUTING.md (not required)
- ❌ CI/CD workflows (not required)
- ❌ CHANGELOG.md (not required)
- ❌ Complex permissions documentation (basic README note is enough)

## Quick Implementation Order

```
1. Add LICENSE file (15 minutes)
   └── Copy standard MIT license text
   
2. Add SECURITY.md (30 minutes)
   └── Use GitHub's template
   
3. Fix test coverage (3-5 hours)
   └── Focus on untested error paths
   └── Add tests until 80% reached
   
4. Submit to Marketplace ✓
```

## Verification

Before submission, verify:
- [ ] LICENSE file exists in root
- [ ] SECURITY.md exists in .github/ or root
- [ ] `npm test -- --coverage` shows ≥80%
- [ ] `npm run build` completes successfully
- [ ] action.yml has required fields

---

**Total Time Required**: Half a day
**No Additional Dependencies**: Everything needed is already in place