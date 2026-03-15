import { describe, expect, test } from "bun:test"
import path from "path"
import { Command } from "../../src/command"
import { Instance } from "../../src/project/instance"

const projectRoot = path.join(__dirname, "../..")

describe("Command", () => {
  describe("hints", () => {
    test("extracts numbered placeholders", () => {
      const template = "Do $1 then $2 and $1 again"
      const result = Command.hints(template)
      expect(result).toEqual(["$1", "$2"])
    })

    test("extracts $ARGUMENTS placeholder", () => {
      const template = "Process $ARGUMENTS with $1"
      const result = Command.hints(template)
      expect(result).toContain("$ARGUMENTS")
      expect(result).toContain("$1")
    })

    test("returns empty array for no placeholders", () => {
      const template = "Simple template with no placeholders"
      const result = Command.hints(template)
      expect(result).toEqual([])
    })

    test("removes duplicates", () => {
      const template = "$1 and $1 and $2 and $2"
      const result = Command.hints(template)
      expect(result).toEqual(["$1", "$2"])
    })
  })

  describe("list", () => {
    test("includes default commands", async () => {
      await Instance.provide({
        directory: projectRoot,
        fn: async () => {
          const commands = await Command.list()
          expect(commands.length).toBeGreaterThan(0)
          expect(commands.map((c) => c.name)).toContain(Command.Default.INIT)
          expect(commands.map((c) => c.name)).toContain(Command.Default.REVIEW)
        },
      })
    })

    test("includes MCP commands", async () => {
      await Instance.provide({
        directory: projectRoot,
        fn: async () => {
          const commands = await Command.list()
          const mcpCommands = commands.filter((c) => c.source === "mcp")
          expect(Array.isArray(mcpCommands)).toBe(true)
        },
      })
    })

    test("includes skill commands", async () => {
      await Instance.provide({
        directory: projectRoot,
        fn: async () => {
          const commands = await Command.list()
          const skillCommands = commands.filter((c) => c.source === "skill")
          expect(Array.isArray(skillCommands)).toBe(true)
        },
      })
    })
  })

  describe("get", () => {
    test("returns default command", async () => {
      await Instance.provide({
        directory: projectRoot,
        fn: async () => {
          const command = await Command.get(Command.Default.INIT)
          expect(command).toBeDefined()
          expect(command?.name).toBe(Command.Default.INIT)
        },
      })
    })

    test("returns undefined for non-existent command", async () => {
      await Instance.provide({
        directory: projectRoot,
        fn: async () => {
          const command = await Command.get("nonexistent-command")
          expect(command).toBeUndefined()
        },
      })
    })
  })

  describe("Default commands", () => {
    test("INIT command has correct properties", async () => {
      await Instance.provide({
        directory: projectRoot,
        fn: async () => {
          const command = await Command.get(Command.Default.INIT)
          expect(command).toBeDefined()
          expect(command?.description).toBe("create/update AGENTS.md")
          expect(command?.source).toBe("command")
          expect(command?.subtask).toBeUndefined()
        },
      })
    })

    test("REVIEW command has correct properties", async () => {
      await Instance.provide({
        directory: projectRoot,
        fn: async () => {
          const command = await Command.get(Command.Default.REVIEW)
          expect(command).toBeDefined()
          expect(command?.description).toBe("review changes [commit|branch|pr], defaults to uncommitted")
          expect(command?.source).toBe("command")
          expect(command?.subtask).toBe(true)
        },
      })
    })
  })
})
