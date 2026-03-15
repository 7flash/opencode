#!/usr/bin/env bun
import { $ } from "bun"

console.log("Git commit map:\n")
const log = await $`git log --oneline --graph --all -20`.text()
console.log(log)

console.log("\nBranches:\n")
const branches = await $`git branch -a`.text()
console.log(branches)

console.log("\nRecent commits:\n")
const commits = await $`git log --format="%h %s (%cr)" -5`.text()
console.log(commits)

console.log("\nStatus:\n")
const status = await $`git status --short`.text()
console.log(status || "  (clean)")

console.log("\nChanged files:\n")
const diff = await $`git diff --name-only HEAD`.text()
console.log(diff || "  (none)")

console.log("\nBranch stats:\n")
const currentBranch = await $`git branch --show-current`.text()
const ahead = await $`git rev-list --count HEAD @{u}`.text().catch(() => "0")
const behind = await $`git rev-list --count @{u}..HEAD`.text().catch(() => "0")
console.log(`  Branch: ${currentBranch.trim()}`)
console.log(`  Ahead: ${ahead.trim()}, Behind: ${behind.trim()}`)

console.log("\nContributors:\n")
const contributors = await $`git log --format="%an" | sort | uniq -c | sort -rn | head -5`.text()
console.log(contributors)

console.log("\nBranch diff (vs origin/dev):\n")
const branchDiff = await $`git diff --stat origin/dev..HEAD`.text()
console.log(branchDiff || "  (up to date)")

console.log("\nStashed changes:\n")
const stash = await $`git stash list`.text()
console.log(stash || "  (none)")

console.log("\nTags:\n")
const tags = await $`git tag --sort=-creatordate | head -10`.text()
console.log(tags || "  (none)")

console.log("\nFile history (last 5 commits):\n")
const fileHistory = await $`git log --oneline --name-only -5 --pretty=format:"%h %s" | head -20`.text()
console.log(fileHistory || "  (none)")
