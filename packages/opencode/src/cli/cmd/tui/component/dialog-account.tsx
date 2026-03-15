import { For, Show, createMemo } from "solid-js"
import { useSync } from "@tui/context/sync"
import { useDialog } from "@tui/ui/dialog"
import { useSDK } from "../context/sdk"
import { useTheme } from "../context/theme"
import { TextAttributes } from "@opentui/core"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useToast } from "../ui/toast"
import { useKV } from "../context/kv"

export function DialogAccount() {
  const sync = useSync()
  const dialog = useDialog()
  const sdk = useSDK()
  const { theme } = useTheme()
  const toast = useToast()
  const kv = useKV()

  const activeAccount = createMemo(() => sync.data.account_active)
  const accounts = createMemo(() => sync.data.account_list ?? [])
  const accountOrgs = createMemo(() => sync.data.account_orgs ?? {})
  const recentOrgs = createMemo(
    () => kv.get("recent_orgs", []) as Array<{ accountID: string; orgID: string; name: string; email: string }>,
  )

  const handleSwitchOrg = async () => {
    if (accounts().length === 0) return

    const options = accounts().flatMap((account: any) =>
      (accountOrgs()[account.id] ?? []).map((org: any) => ({
        title: `${org.name} (${account.email})`,
        value: { accountID: account.id, orgID: org.id },
        description: account.url,
      })),
    )

    if (options.length === 0) return

    const selected = await new Promise<{ accountID: string; orgID: string } | null>((resolve) => {
      dialog.replace(
        () => (
          <DialogSelect title="Switch organization" options={options} onSelect={(opt: any) => resolve(opt.value)} />
        ),
        () => resolve(null),
      )
    })

    if (!selected) return

    await sdk.client.account.use({ accountID: selected.accountID, orgID: selected.orgID })
    await sync.bootstrap()
    dialog.clear()

    const orgList = accountOrgs()[selected.accountID] ?? []
    const org = orgList.find((o: any) => o.id === selected.orgID)
    if (org) {
      // Save to recent orgs
      const account = accounts().find((a: any) => a.id === selected.accountID)
      const recent = recentOrgs().filter((r) => !(r.accountID === selected.accountID && r.orgID === selected.orgID))
      recent.unshift({
        accountID: selected.accountID,
        orgID: selected.orgID,
        name: org.name,
        email: account?.email ?? "",
      })
      kv.set("recent_orgs", recent.slice(0, 5))

      toast.show({
        title: "Organization switched",
        message: `Switched to ${org.name}`,
        variant: "success",
        duration: 3000,
      })
    }
  }

  const handleLogout = async () => {
    if (accounts().length === 0) return

    const options = accounts().map((account) => ({
      title: `${account.email} (${account.url})`,
      value: account.id,
    }))

    const selected = await new Promise<string | null>((resolve) => {
      dialog.replace(
        () => <DialogSelect title="Log out from account" options={options} onSelect={(opt) => resolve(opt.value)} />,
        () => resolve(null),
      )
    })

    if (!selected) return

    await sdk.client.account.remove({ accountID: selected })
    await sync.bootstrap()
    dialog.clear()
  }

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          Account
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>

      <Show
        when={activeAccount()}
        fallback={<text fg={theme.text}>Not logged in. Run opencode account login to authenticate.</text>}
      >
        <box flexDirection="column" gap={1}>
          <box flexDirection="row" gap={1}>
            <text fg={theme.success}>•</text>
            <text fg={theme.text}>
              <b>{activeAccount()?.account?.email ?? ""}</b>
            </text>
          </box>
          <box flexDirection="row" gap={1} paddingLeft={2}>
            <text fg={theme.text}>Org: </text>
            <text fg={theme.text}>{activeAccount()?.org?.name ?? "None"}</text>
          </box>
        </box>
      </Show>

      <box height={1} />

      <Show when={accounts().length > 0}>
        <box flexDirection="column" gap={1}>
          <text fg={theme.text} attributes={TextAttributes.BOLD}>
            Actions
          </text>
          <box flexDirection="row" gap={2} onMouseUp={handleSwitchOrg}>
            <text fg={theme.text} attributes={TextAttributes.BOLD}>
              Switch org
            </text>
          </box>
          <box flexDirection="row" gap={2} onMouseUp={handleLogout}>
            <text fg={theme.text} attributes={TextAttributes.BOLD}>
              Log out
            </text>
          </box>
        </box>
      </Show>

      <Show when={recentOrgs().length > 0}>
        <box height={1} />
        <box flexDirection="column" gap={1}>
          <text fg={theme.text} attributes={TextAttributes.BOLD}>
            Recent
          </text>
          <For each={recentOrgs()}>
            {(recent) => (
              <box
                flexDirection="row"
                gap={2}
                onMouseUp={async () => {
                  await sdk.client.account.use({ accountID: recent.accountID, orgID: recent.orgID })
                  await sync.bootstrap()
                  dialog.clear()
                  toast.show({
                    title: "Organization switched",
                    message: `Switched to ${recent.name}`,
                    variant: "success",
                    duration: 3000,
                  })
                }}
              >
                <text fg={theme.text}>
                  {recent.name} <span style={{ fg: theme.textMuted }}>({recent.email})</span>
                </text>
              </box>
            )}
          </For>
        </box>
      </Show>
    </box>
  )
}
