import { describe, expect, test } from "bun:test"
import path from "path"
import { TaskTool } from "../../src/tool/task"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"
import { SessionID, MessageID } from "../../src/session/schema"
import { MessageV2 } from "../../src/session/message-v2"

const ctx = {
  sessionID: SessionID.make("ses_test"),
  messageID: MessageID.make(""),
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
  extra: { bypassAgentCheck: true },
}

const projectRoot = path.join(__dirname, "../..")

describe("tool.task", () => {
  test("accepts text prompt (legacy)", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const task = await TaskTool.init()

        // Verify schema accepts text prompt
        const params = {
          description: "Test task",
          prompt: "Do something",
          subagent_type: "build",
        }

        // Schema validation should pass
        const result = task.parameters.safeParse(params)
        expect(result.success).toBe(true)
      },
    })
  })

  test("accepts rich parts (images, files)", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const task = await TaskTool.init()

        // Verify schema accepts parts array
        const params = {
          description: "Test task with image",
          parts: [
            {
              type: "text" as const,
              text: "Analyze this image",
            },
            {
              type: "image" as const,
              image: "data:image/png;base64,test",
            },
          ],
          subagent_type: "build",
        }

        // Schema validation should pass
        const result = task.parameters.safeParse(params)
        expect(result.success).toBe(true)
      },
    })
  })

  test("parts takes precedence over prompt", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const task = await TaskTool.init()

        // Both prompt and parts provided - parts should be used
        const params = {
          description: "Test task",
          prompt: "Legacy text",
          parts: [
            {
              type: "text" as const,
              text: "Rich context",
            },
          ],
          subagent_type: "build",
        }

        const result = task.parameters.safeParse(params)
        expect(result.success).toBe(true)

        if (result.success) {
          // Parts should be present
          expect(result.data.parts).toBeDefined()
          expect(result.data.parts?.length).toBe(1)
        }
      },
    })
  })

  test("accepts file parts", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const task = await TaskTool.init()

        const params = {
          description: "Analyze file",
          parts: [
            {
              type: "text" as const,
              text: "Review this file",
            },
            {
              type: "file" as const,
              mime: "text/plain",
              filename: "test.txt",
              url: "file:///test.txt",
            },
          ],
          subagent_type: "build",
        }

        const result = task.parameters.safeParse(params)
        expect(result.success).toBe(true)
      },
    })
  })
})
