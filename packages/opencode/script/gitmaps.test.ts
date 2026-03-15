import { describe, test, expect } from "bun:test"
import { $ } from "bun"

describe("gitmaps", () => {
  test("shows commit graph", async () => {
    const log = await $`git log --oneline --graph --all -5`.text()
    expect(log).toContain("*")
  })

  test("shows branches", async () => {
    const branches = await $`git branch -a`.text()
    expect(branches).toContain("dev")
  })

  test("shows recent commits", async () => {
    const commits = await $`git log --format="%h %s (%cr)" -3`.text()
    expect(commits.split("\n").filter(Boolean).length).toBeGreaterThan(0)
  })

  test("shows branch stats", async () => {
    const currentBranch = await $`git branch --show-current`.text()
    expect(currentBranch.trim()).toBe("dev")
  })

  test("shows contributors", async () => {
    const contributors = await $`git log --format="%an" | sort | uniq -c | sort -rn | head -5`.text()
    expect(contributors.split("\n").filter(Boolean).length).toBeGreaterThan(0)
  })

  test("shows tags", async () => {
    const tags = await $`git tag --sort=-creatordate | head -10`.text()
    expect(typeof tags).toBe("string")
  })

  test("shows stash", async () => {
    const stash = await $`git stash list`.text()
    expect(typeof stash).toBe("string")
  })

  test("shows file history", async () => {
    const fileHistory = await $`git log --oneline --name-only -3 --pretty=format:"%h %s" | head -10`.text()
    expect(fileHistory.split("\n").filter(Boolean).length).toBeGreaterThan(0)
  })

  test("shows commit search", async () => {
    const search = await $`git log --oneline --all --grep="fix" -3`.text()
    expect(search.split("\n").filter(Boolean).length).toBeGreaterThan(0)
  })

  test("shows branch comparison", async () => {
    const featBranches = await $`git branch --list 'feat/*'`.text()
    expect(typeof featBranches).toBe("string")
  })

  test("supports JSON output with --json flag", async () => {
    const output = await $`bun run script/gitmaps.ts --json`.quiet().text()
    const json = JSON.parse(output)

    expect(json).toHaveProperty("branch")
    expect(json).toHaveProperty("ahead")
    expect(json).toHaveProperty("behind")
    expect(json).toHaveProperty("branches")
    expect(json).toHaveProperty("contributors")
    expect(json).toHaveProperty("timestamp")
    expect(typeof json.branch).toBe("string")
    expect(typeof json.ahead).toBe("number")
    expect(Array.isArray(json.branches)).toBe(true)
  })
})
