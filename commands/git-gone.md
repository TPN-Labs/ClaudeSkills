# `git-gone`

Deletes local branches whose upstream branch was removed on the remote — for example, after a PR is merged and its branch deleted on GitHub.

## Usage

```sh
git-gone            # safe delete (git branch -d) — only fully-merged branches
git-gone -f         # force delete (git branch -D) — even unmerged branches
git-gone --force    # same as -f
```

If there is nothing to clean up, it prints `No branches to prune.`

## Function

Add this to your `~/.zshrc` (or `~/.bashrc`):

```zsh
git-gone() {
  git fetch --prune
  local flag="-d"
  [[ "$1" == "-f" || "$1" == "--force" ]] && flag="-D"
  local gone
  gone=$(git branch -v | awk '/: gone]/ {print $1}')
  if [[ -z "$gone" ]]; then
    echo "No branches to prune."
    return 0
  fi
  echo "$gone" | xargs -r git branch "$flag"
}
```

## How it works

1. `git fetch --prune` removes remote-tracking refs for branches deleted on the remote.
2. `git branch -v` marks branches whose upstream is missing with `[... : gone]`; `awk` extracts their names.
3. The matching branches are deleted with `git branch -d` (or `-D` when forced). `xargs -r` skips the delete entirely if the list is empty.
