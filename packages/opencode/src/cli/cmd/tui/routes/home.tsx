import { Prompt, type PromptRef } from "@tui/component/prompt"
import { createEffect, createMemo, Match, on, onMount, Show, Switch } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useKeybind } from "@tui/context/keybind"
import { Logo } from "../component/logo"
import { Tips } from "../component/tips"
import { Spinner } from "../component/spinner"
import { Locale } from "@/util/locale"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useDirectory } from "../context/directory"
import { useRouteData } from "@tui/context/route"
import { usePromptRef } from "../context/prompt"
import { Installation } from "@/installation"
import { useKV } from "../context/kv"
import { useCommandDialog } from "../component/dialog-command"
import { DialogAccount } from "../component/dialog-account"
import { useLocal } from "../context/local"
import { TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"

// TODO: what is the best way to do this?
let once = false

export function Home() {
  const sync = useSync()
  const kv = useKV()
  const { theme } = useTheme()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const command = useCommandDialog()
  const mcp = createMemo(() => Object.keys(sync.data.mcp).length > 0)
  const mcpError = createMemo(() => {
    return Object.values(sync.data.mcp).some((x) => x.status === "failed")
  })

  const connectedMcpCount = createMemo(() => {
    return Object.values(sync.data.mcp).filter((x) => x.status === "connected").length
  })

  const orgName = createMemo(() => {
    return sync.data.account_active?.org?.name
  })

  const isFirstTimeUser = createMemo(() => sync.data.session.length === 0)
  const tipsHidden = createMemo(() => kv.get("tips_hidden", false))
  const showTips = createMemo(() => {
    // Don't show tips for first-time users
    if (isFirstTimeUser()) return false
    return !tipsHidden()
  })

  command.register(() => [
    {
      title: tipsHidden() ? "Show tips" : "Hide tips",
      value: "tips.toggle",
      keybind: "tips_toggle",
      category: "System",
      onSelect: (dialog) => {
        kv.set("tips_hidden", !tipsHidden())
        dialog.clear()
      },
    },
    {
      title: "Account",
      value: "account",
      keybind: "account",
      category: "System",
      slash: { name: "account", aliases: ["org"] },
      onSelect: (dialog) => {
        dialog.replace(() => <DialogAccount />)
      },
    },
  ])

  const Hint = (
    <Show when={connectedMcpCount() > 0}>
      <box flexShrink={0} flexDirection="row" gap={1}>
        <text fg={theme.text}>
          <Switch>
            <Match when={mcpError()}>
              <span style={{ fg: theme.error }}>•</span> mcp errors{" "}
              <span style={{ fg: theme.textMuted }}>ctrl+x s</span>
            </Match>
            <Match when={true}>
              <span style={{ fg: theme.success }}>•</span>{" "}
              {Locale.pluralize(connectedMcpCount(), "{} mcp server", "{} mcp servers")}
            </Match>
          </Switch>
        </text>
      </box>
    </Show>
  )

  let prompt: PromptRef
  const args = useArgs()
  const local = useLocal()
  onMount(() => {
    if (once) return
    if (route.initialPrompt) {
      prompt.set(route.initialPrompt)
      once = true
    } else if (args.prompt) {
      prompt.set({ input: args.prompt, parts: [] })
      once = true
    }
  })

  // Wait for sync and model store to be ready before auto-submitting --prompt
  createEffect(
    on(
      () => sync.ready && local.model.ready,
      (ready) => {
        if (!ready) return
        if (!args.prompt) return
        if (prompt.current?.input !== args.prompt) return
        prompt.submit()
      },
    ),
  )
  const directory = useDirectory()

  const keybind = useKeybind()

  useKeyboard((evt) => {
    if (sync.data.status === "error" && evt.name === "r") {
      sync.retry()
    }
  })

  return (
    <>
      <Show when={sync.data.status === "loading"}>
        <box flexGrow={1} alignItems="center" justifyContent="center" flexDirection="column" gap={2}>
          <Logo />
          <Spinner>{sync.data.progress?.label ?? "Loading..."}</Spinner>
          <Show when={sync.data.progress}>
            <box flexDirection="row" gap={1} alignItems="center">
              <text fg={theme.textMuted}>
                {"["}
                {(() => {
                  const p = sync.data.progress!
                  const total = p.total || 1
                  const filled = Math.round((p.current / total) * 20)
                  return "=".repeat(filled) + " ".repeat(20 - filled)
                })()}
                {"]"}
              </text>
              <text fg={theme.textMuted}>
                {Math.round((sync.data.progress!.current / (sync.data.progress!.total || 1)) * 100)}%
              </text>
            </box>
          </Show>
        </box>
      </Show>
      <Show when={sync.data.status === "error"}>
        <box flexGrow={1} alignItems="center" justifyContent="center" flexDirection="column" gap={2}>
          <Logo />
          <box flexDirection="column" gap={1} alignItems="center">
            <text fg={theme.error} attributes={TextAttributes.BOLD}>
              Failed to load
            </text>
            <text fg={theme.textMuted} maxWidth={60}>
              {sync.data.error?.message ?? "An unknown error occurred"}
            </text>
            <box height={1} />
            <box backgroundColor={theme.primary} padding={1} onMouseUp={() => sync.retry()}>
              <text fg={theme.background} attributes={TextAttributes.BOLD}>
                Retry
              </text>
            </box>
            <text fg={theme.textMuted}>
              Press <text fg={theme.text}>R</text> to retry
            </text>
          </box>
        </box>
      </Show>
      <Show when={sync.data.status !== "loading" && sync.data.status !== "error"}>
        <box flexGrow={1} alignItems="center" paddingLeft={2} paddingRight={2}>
          <box flexGrow={1} minHeight={0} />
          <box height={4} minHeight={0} flexShrink={1} />
          <box flexShrink={0}>
            <Logo />
          </box>
          <box height={1} minHeight={0} flexShrink={1} />
          <box width="100%" maxWidth={75} zIndex={1000} paddingTop={1} flexShrink={0}>
            <Prompt
              ref={(r) => {
                prompt = r
                promptRef.set(r)
              }}
              hint={Hint}
              workspaceID={route.workspaceID}
            />
          </box>
          <box height={4} minHeight={0} width="100%" maxWidth={75} alignItems="center" paddingTop={3} flexShrink={1}>
            <Show when={showTips()}>
              <Tips />
            </Show>
          </box>
          <box flexGrow={1} minHeight={0} />
          <Toast />
        </box>
        <box
          paddingTop={1}
          paddingBottom={1}
          paddingLeft={2}
          paddingRight={2}
          flexDirection="row"
          flexShrink={0}
          gap={2}
        >
          <text fg={theme.textMuted}>{directory()}</text>
          <box gap={1} flexDirection="row" flexShrink={0}>
            <Show when={orgName()}>
              <text fg={theme.text}>
                <span style={{ fg: theme.success }}>●</span> {orgName()}
              </text>
              <text fg={theme.textMuted}>/account</text>
            </Show>
            <Show when={mcp()}>
              <text fg={theme.text}>
                <Switch>
                  <Match when={mcpError()}>
                    <span style={{ fg: theme.error }}>⊙ </span>
                  </Match>
                  <Match when={true}>
                    <span style={{ fg: connectedMcpCount() > 0 ? theme.success : theme.textMuted }}>⊙ </span>
                  </Match>
                </Switch>
                {connectedMcpCount()} MCP
              </text>
              <text fg={theme.textMuted}>/status</text>
            </Show>
          </box>
          <box flexGrow={1} />
          <box flexShrink={0}>
            <text fg={theme.textMuted}>{Installation.VERSION}</text>
          </box>
        </box>
      </Show>
    </>
  )
}
