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
