import { Hono } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import z from "zod"
import { AccountService } from "../../account/service"
import { AccountID, OrgID } from "../../account/schema"
import { Option, Effect } from "effect"
import { errors } from "../error"
import { lazy } from "../../util/lazy"
import { runtime } from "@/effect/runtime"

export const AccountRoutes = lazy(() =>
  new Hono()
    .get(
      "/list",
      describeRoute({
        summary: "List accounts",
        description: "Get a list of all authenticated accounts.",
        operationId: "account.list",
        responses: {
          200: {
            description: "List of accounts",
            content: {
              "application/json": {
                schema: resolver(
                  z.array(
                    z.object({
                      id: z.string(),
                      email: z.string(),
                      url: z.string(),
                    }),
                  ),
                ),
              },
            },
          },
        },
      }),
      async (c) => {
        const accounts = await runtime.runPromise(AccountService.use((s) => s.list()))
        return c.json(
          accounts.map((a: any) => ({
            id: a.id,
            email: a.email,
            url: a.url,
          })),
        )
      },
    )
    .get(
      "/active",
      describeRoute({
        summary: "Get active account",
        description: "Get the currently active account and organization.",
        operationId: "account.active",
        responses: {
          200: {
            description: "Active account and org",
            content: {
              "application/json": {
                schema: resolver(
                  z.object({
                    account: z
                      .object({
                        id: z.string(),
                        email: z.string(),
                        url: z.string(),
                      })
                      .nullable(),
                    org: z
                      .object({
                        id: z.string(),
                        name: z.string(),
                      })
                      .nullable(),
                  }),
                ),
              },
            },
          },
        },
      }),
      async (c) => {
        const active = await runtime.runPromise(AccountService.use((s) => s.active()))
        if (Option.isNone(active)) {
          return c.json({ account: null, org: null })
        }

        const account = active.value
        return c.json({
          account: {
            id: account.id,
            email: account.email,
            url: account.url,
          },
          org: null,
        })
      },
    )
    .get(
      "/orgs",
      describeRoute({
        summary: "List organizations by account",
        description: "Get organizations grouped by account.",
        operationId: "account.orgs",
        responses: {
          200: {
            description: "Organizations grouped by account",
            content: {
              "application/json": {
                schema: resolver(
                  z.array(
                    z.object({
                      account: z.object({
                        id: z.string(),
                        email: z.string(),
                        url: z.string(),
                      }),
                      orgs: z.array(
                        z.object({
                          id: z.string(),
                          name: z.string(),
                        }),
                      ),
                    }),
                  ),
                ),
              },
            },
          },
        },
      }),
      async (c) => {
        const groups = await runtime.runPromise(AccountService.use((s) => s.orgsByAccount()))
        return c.json(
          groups.map((g: any) => ({
            account: {
              id: g.account.id,
              email: g.account.email,
              url: g.account.url,
            },
            orgs: g.orgs.map((o: any) => ({
              id: o.id,
              name: o.name,
            })),
          })),
        )
      },
    )
    .post(
      "/use",
      describeRoute({
        summary: "Set active account and org",
        description: "Set the active account and organization.",
        operationId: "account.use",
        responses: {
          200: {
            description: "Successfully set active account and org",
            content: {
              "application/json": {
                schema: resolver(z.boolean()),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "json",
        z.object({
          accountID: z.string(),
          orgID: z.string(),
        }),
      ),
      async (c) => {
        const { accountID, orgID } = c.req.valid("json")
        await runtime.runPromise(
          AccountService.use((s) => s.use(AccountID.make(accountID), Option.some(OrgID.make(orgID)))),
        )
        return c.json(true)
      },
    )
    .delete(
      "/:accountID",
      describeRoute({
        summary: "Remove account",
        description: "Remove an authenticated account.",
        operationId: "account.remove",
        responses: {
          200: {
            description: "Successfully removed account",
            content: {
              "application/json": {
                schema: resolver(z.boolean()),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "param",
        z.object({
          accountID: z.string(),
        }),
      ),
      async (c) => {
        const { accountID } = c.req.valid("param")
        await runtime.runPromise(AccountService.use((s) => s.remove(AccountID.make(accountID))))
        return c.json(true)
      },
    )
    .get(
      "/orgs/:accountID",
      describeRoute({
        summary: "List orgs for account",
        description: "Get organizations for a specific account.",
        operationId: "account.orgs.byAccount",
        responses: {
          200: {
            description: "List of organizations",
            content: {
              "application/json": {
                schema: resolver(
                  z.array(
                    z.object({
                      id: z.string(),
                      name: z.string(),
                    }),
                  ),
                ),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "param",
        z.object({
          accountID: z.string(),
        }),
      ),
      async (c) => {
        const { accountID } = c.req.valid("param")
        const orgs = await runtime.runPromise(AccountService.use((s) => s.orgs(AccountID.make(accountID))))
        return c.json(
          orgs.map((o: any) => ({
            id: o.id,
            name: o.name,
          })),
        )
      },
    ),
)
