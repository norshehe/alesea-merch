---
name: commit
description: Commit staged and unstaged changes with an auto-generated conventional commit message. Analyzes the diff, generates a concise commit message following the Conventional Commits spec, asks the user to confirm or edit, then optionally pushes. Use when the user says "commit", "commit my changes", "save my work", or "/commit".
---

# Commit with Conventional Commit Message

This skill commits the current changes with an auto-generated conventional commit message and optionally pushes to remote.

---

## Workflow

### Step 1: Gather context

Run these commands **in parallel**:

1. `git status` — see all changed, staged, and untracked files (never use `-uall`)
2. `git diff` — unstaged changes
3. `git diff --cached` — staged changes
4. `git log --oneline -10` — recent commit history for style reference
5. `git branch --show-current` — current branch name

### Step 2: Stage files

- If there are unstaged or untracked files, stage them with `git add <specific-files>`.
- **Never** use `git add -A` or `git add .` — always add specific files by name.
- **Never** stage files that look like secrets (`.env`, `.env.local`, `credentials.json`, tokens, etc.). Warn the user if such files are detected.
- If all changes are already staged, skip this step.

### Step 3: Generate the commit message

Analyze the staged diff and generate a commit message following the **Conventional Commits** specification:

```
<type>(<scope>): <short description>

<optional body — only if the change is non-trivial>

Co-Authored-By: Claude Code <noreply@anthropic.com>
```

#### Type reference

| Type | When to use |
|---|---|
| `feat` | A new feature or user-facing functionality |
| `fix` | A bug fix |
| `refactor` | Code restructuring with no behavior change |
| `style` | Formatting, whitespace (no logic change) |
| `docs` | Documentation only |
| `chore` | Build process, dependencies, tooling, config |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `ci` | CI/CD pipeline changes |
| `revert` | Reverting a previous commit |

#### Scope

- Use the primary feature or domain affected (e.g., `catalog`, `cart`, `product`, `ui`, `contentful`, `checkout`).
- If multiple scopes are affected equally, pick the most significant one or omit scope.

#### Rules

- **Subject line**: imperative mood, lowercase, no period, max 72 chars.
- **Body** (optional): explain *why* the change was made, not *what*. Wrap at 72 chars.
- Focus on the intent and impact of the changes.

### Step 4: Present the commit message to the user

Show the generated commit message and ask the user to confirm or edit it using `AskUserQuestion`:

- Option 1: **Commit as-is** — proceed with the generated message
- Option 2: **Edit message** — let the user provide a custom message

### Step 5: Create the commit

Run the commit using a HEREDOC for proper formatting:

```bash
git commit -m "$(cat <<'EOF'
<commit message here>

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

- **Never** amend a previous commit unless the user explicitly asks.
- **Never** use `--no-verify` unless the user explicitly asks.
- If a pre-commit hook fails, fix the issue, re-stage, and create a **new** commit.

### Step 6: Ask to push

After a successful commit, ask the user whether to push using `AskUserQuestion`:

- Option 1: **Push** — run `git push` (or `git push -u origin <branch>` if no upstream is set)
- Option 2: **Don't push** — skip pushing

**Never** force push unless the user explicitly requests it. If pushing to `main`/`master`, warn the user first.

### Step 7: Confirm completion

Show a brief summary: commit hash (short), message, whether it was pushed, current branch.

---

## Error Handling

- **No changes to commit**: Inform the user and exit.
- **Pre-commit hook failure**: Read the error, fix if possible, re-stage, create a new commit. Do NOT amend.
- **Push failure**: Show the error and suggest next steps (e.g., pull first).
- **Merge conflicts**: Do not auto-resolve. Inform the user and let them handle it.
