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

## UI Responsiveness Rules

### Rule: All UI elements and pages must be responsive

- Every page and component built in `apps/web` must render correctly across mobile, tablet, and
  desktop viewport widths — mobile users must not get a broken or degraded layout.
- Use responsive Tailwind utilities (`sm:`/`md:`/`lg:` breakpoints, flex/grid wrapping) rather than
  fixed pixel widths or desktop-only layouts.
- Purely decorative elements (e.g. large illustration/brand panels) may be hidden on small
  viewports (`hidden md:flex` and similar), but the functional content of the page must remain
  fully usable at all widths.
- Verify responsiveness (e.g. by resizing the browser or checking multiple viewport widths) before
  considering a UI task complete.
