## Git Commit Safety Rules

### Rule: Never commit without explicit user approval

- **Do not create, amend, or push any Git commit unless the user has explicitly asked you to do so.**
- Completing code changes, fixes, or refactoring **does not imply permission to commit**.
- Before running any `git commit`, `git commit --amend`, `git push`, or similar command that creates or modifies commit history, ask the user for confirmation.
- If you believe the work is ready to commit, respond with a message similar to:
  > "The changes are ready. Would you like me to create a Git commit? If yes, I can also suggest a commit message."
- Wait for explicit approval (e.g., "yes", "commit it", or a provided commit message) before proceeding.
- If the user declines or does not respond with approval, do not perform any commit-related action.
- This rule takes precedence over any workflow or automation that would otherwise commit changes automatically.
