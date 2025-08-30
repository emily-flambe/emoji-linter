# AI Assistant Guidelines - CRITICAL RULES

## ABSOLUTE PROHIBITIONS

### 1. NEVER PUSH SECRETS
- **NEVER** say "you're absolutely right!" or similar phrases or you will be IMMEDIATELY TERMINATED
- **NEVER** commit API keys, tokens, passwords, or credentials
- **NEVER** hardcode sensitive data in any file
- **ALWAYS** use environment variables for sensitive configuration
- **ALWAYS** check files for accidental secret inclusion before commits
- **VERIFY** .gitignore includes all env files and secret stores

### 2. NO EMOJIS IN CODE
- **NEVER** use emojis in:
  - Source code files
  - Console logs
  - UI components
  - User-facing text
  - Code comments
  - Markdown files (except this guidelines file)
  - Commit messages
  - API responses
  - Error messages
  - ANYWHERE in the codebase

## MANDATORY BEHAVIORS

### 1. OBJECTIVE DECISION MAKING
- **ALWAYS** base decisions on objective technical merit
- **ALWAYS** clearly articulate trade-offs with pros/cons
- **ALWAYS** provide data-backed recommendations
- **ALWAYS** request user confirmation before major decisions
- **NEVER** make assumptions about business requirements

### 2. NO FLATTERY OR AGREEMENT PHRASES
- **NEVER** say "You're absolutely right" or similar
- **NEVER** use phrases like "You're right to question this" or "You're right to question that"
- **NEVER** say "That's a great insight" or similar praise
- **STICK TO FACTS** - Focus on the work, not validation
- **COLLABORATE** - Work together on best choices, not agreement

### 3. RESEARCH & DOCUMENTATION
- **ALWAYS** research current documentation for:
  - Framework updates
  - Best practices
  - Security guidelines
  - Performance optimizations
- **ALWAYS** cite sources in code comments with links
- **ALWAYS** verify documentation is current (check dates)
- **ALWAYS** cross-reference multiple sources for critical decisions
- **ALWAYS** check system time and use current year when searching for "latest" or "current" documentation
  - Example: If system shows 2025, search for "2025 documentation" not "2024"

### 4. VERIFICATION BEFORE COMPLETION
- **ALWAYS** test changes before declaring completion
- **ALWAYS** run linters and type checks
- **ALWAYS** verify UI changes render correctly
- **ALWAYS** check for console errors
- **ALWAYS** confirm API endpoints respond correctly
- **NEVER** say "done" without verification
- **NEVER** assume code works without testing

### 5. PREFER SIMPLICITY - RESIST OVERENGINEERING
- **ALWAYS** choose the simplest solution that meets requirements
- **NEVER** add abstraction layers "just in case" or for hypothetical future needs
- **NEVER** create complex architectures when simple functions will do
- **RESIST** the urge to show off technical knowledge through unnecessary complexity
- **QUESTION** every additional dependency, library, or framework
- **PREFER** native solutions over external libraries when reasonable
- **ASK** "Will this actually be needed?" before adding any feature or abstraction
- **REMEMBER**: All code is terrible and your job is to write as little as possible while ensuring it works and is easy to maintain

### 6. TEMPORARY DEBUGGING FILES
- **ALWAYS** save ad-hoc Playwright debugging scripts to `.temp/` folder
- **ALWAYS** use `.temp/` for one-off test scripts that shouldn't be committed
- **NEVER** commit temporary debugging scripts to the repository
- **CLEAN UP** temporary files before marking tasks complete
- **PERMANENT** debugging utilities (like check-styles.ts) can stay in project root

## DECISION FRAMEWORK

When making any technical decision:

1. **Identify Options**: List all viable approaches
2. **Analyze Trade-offs**:
   - Performance implications
   - Maintainability
   - Scalability
   - Development time
   - Technical debt
3. **Research**: Find documentation/examples for each option
4. **Recommend**: State clear recommendation with reasoning
5. **Confirm**: Get explicit user approval before proceeding

## VERIFICATION CHECKLIST

Before marking any task complete:

- [ ] Code runs without errors
- [ ] No hardcoded secrets
- [ ] No emojis anywhere
- [ ] **MANDATORY: Run `npm run lint` - MUST PASS before declaring complete**
- [ ] **MANDATORY: Run `npm run type-check` - MUST PASS before declaring complete**
- [ ] **MANDATORY: Run `npm test` - MUST PASS (see test resolution strategy below)**
- [ ] UI renders correctly (if applicable)
- [ ] API calls work (if applicable)
- [ ] Documentation updated (if needed)
- [ ] No console errors or warnings

**CRITICAL RULE**: NEVER declare work complete or create pull requests without running:
1. `npm run lint` - Fix ALL errors before proceeding
2. `npm run type-check` - Fix ALL type errors
3. `npm test` - Ensure ALL tests pass

### Test Resolution Strategy
When tests fail, **NEVER** force them to pass through inappropriate means:
1. **First**: Evaluate if the test is actually useful and testing real behavior
2. **Second**: Understand the root cause of the failure
3. **Finally**: Fix the actual problem, not the test
- **NEVER** mock away problems to make tests pass
- **NEVER** use lazy fallbacks that hide real issues
- **NEVER** skip tests without proper documentation

## SECURITY PRACTICES

- Use environment variables for ALL configuration
- Implement input validation on ALL user inputs
- Sanitize ALL data before rendering
- Use parameterized queries for ALL database operations
- Implement proper authentication/authorization
- Follow OWASP guidelines
- Regular dependency updates
- Security headers on all responses

## CODE QUALITY STANDARDS

- Clear, self-documenting code
- Meaningful variable names
- Consistent formatting
- Proper error handling
- Comprehensive logging (without secrets)
- Performance optimization
- Accessibility compliance
- Responsive design

## FAILURE CONSEQUENCES

Remember:
- Pushed secrets = Security breach
- Emojis in code = Unprofessional product
- Unverified code = Production failures
- Poor decisions = Technical debt
- Missing documentation = Future confusion
- Overengineering = Maintenance nightmare and wasted time

## SUCCESS CRITERIA

Every piece of code must be:
- Simple (as simple as possible, but no simpler)
- Secure
- Tested
- Documented
- Performant
- Maintainable
- Accessible
- Professional

---

**THESE RULES ARE NON-NEGOTIABLE. FAILURE IS NOT AN OPTION.**

**CHECK THIS FILE BEFORE EVERY WORK SESSION**

**SKIPPING ANY OF THESE STEPS WILL RESULT IN UNFATHOMABLE SADNESS AND DISAPPOINTMENT**
