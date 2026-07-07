#!/usr/bin/env node
import { randomUUID } from "node:crypto"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { isInitializeRequest, Tool } from "@modelcontextprotocol/sdk/types.js"
import * as z from "zod/v4"
import type { Request, Response } from "express"
import {
  logger,
  McpError,
  loadAllJenkinsInstances,
  loadToolFilter,
  CliArgs,
} from "./common/index.js"
import { JenkinsClient } from "./lib/jenkins-client.js"
import { getJobStatus } from "./tools/get-job-status.js"
import { getJobParameters } from "./tools/get-job-parameters.js"
import { getBuildStatus } from "./tools/get-build-status.js"
import { getConsoleLog } from "./tools/get-console-log.js"
import { triggerBuild } from "./tools/trigger-build.js"
import { listJobs } from "./tools/list-jobs.js"
import { getRecentBuilds } from "./tools/get-recent-builds.js"
import { listArtifacts } from "./tools/list-artifacts.js"
import { getArtifact } from "./tools/get-artifact.js"
import { searchJobs } from "./tools/search-jobs.js"
import { stopBuild } from "./tools/stop-build.js"
import { deleteBuild } from "./tools/delete-build.js"
import { getTestResults } from "./tools/get-test-results.js"
import { getQueue } from "./tools/get-queue.js"
import { cancelQueue } from "./tools/cancel-queue.js"
import { enableJob } from "./tools/enable-job.js"
import { disableJob } from "./tools/disable-job.js"
import { deleteJob } from "./tools/delete-job.js"
import { getJobConfig } from "./tools/get-job-config.js"
import { listNodes } from "./tools/list-nodes.js"
import { getSystemInfo } from "./tools/get-system-info.js"
import { getVersion } from "./tools/get-version.js"
import { getPlugins } from "./tools/get-plugins.js"
import { getBuildChanges } from "./tools/get-build-changes.js"
import { getPipelineStages } from "./tools/get-pipeline-stages.js"
import { replayBuild } from "./tools/replay-build.js"
import { createJob } from "./tools/create-job.js"
import { updateJobConfig } from "./tools/update-job-config.js"
import { renameJob } from "./tools/rename-job.js"
import { copyJob } from "./tools/copy-job.js"
import { getNode } from "./tools/get-node.js"
import { toggleNodeOffline } from "./tools/toggle-node-offline.js"
import { listViews } from "./tools/list-views.js"
import { getView } from "./tools/get-view.js"
import { quietDown } from "./tools/quiet-down.js"
import { cancelQuietDown } from "./tools/cancel-quiet-down.js"
import { safeRestart } from "./tools/safe-restart.js"

const instanceProperty = {
  instance: {
    type: "string",
    description:
      "Jenkins instance name (optional — defaults to first configured instance)",
  },
}

const injectInstance = (tool: Tool): Tool => ({
  ...tool,
  inputSchema: {
    ...tool.inputSchema,
    properties: {
      ...instanceProperty,
      ...(tool.inputSchema.properties as object),
    },
  },
})

import { rawTools } from "./tool-manifest.js"

const { allowlist, blocklist } = loadToolFilter()

if (allowlist && blocklist.length) {
  logger.warn(
    "Both JENKINS_TOOLS and JENKINS_BLOCK_TOOLS are set — JENKINS_BLOCK_TOOLS will be ignored",
  )
}

const filteredRawTools = allowlist
  ? rawTools.filter((t) => allowlist.includes(t.name))
  : blocklist.length
    ? rawTools.filter((t) => !blocklist.includes(t.name))
    : rawTools

if (allowlist) {
  logger.info("Tool allowlist active", { tools: allowlist })
} else if (blocklist.length) {
  logger.info("Tool blocklist active", { blocked: blocklist })
}

const tools = filteredRawTools.map(injectInstance)

// Map tool names to handler functions
type ToolHandler = (client: JenkinsClient, input: any) => Promise<any>
const toolHandlers: Record<string, ToolHandler> = {
  jenkins_list_jobs: listJobs,
  jenkins_search_jobs: searchJobs,
  jenkins_get_job_status: getJobStatus,
  jenkins_get_job_parameters: getJobParameters,
  jenkins_get_build_status: getBuildStatus,
  jenkins_get_recent_builds: getRecentBuilds,
  jenkins_get_console_log: getConsoleLog,
  jenkins_trigger_build: triggerBuild,
  jenkins_list_artifacts: listArtifacts,
  jenkins_get_artifact: getArtifact,
  jenkins_stop_build: stopBuild,
  jenkins_delete_build: deleteBuild,
  jenkins_get_test_results: getTestResults,
  jenkins_get_build_changes: getBuildChanges,
  jenkins_get_pipeline_stages: getPipelineStages,
  jenkins_replay_build: replayBuild,
  jenkins_get_queue: getQueue,
  jenkins_cancel_queue: cancelQueue,
  jenkins_enable_job: enableJob,
  jenkins_disable_job: disableJob,
  jenkins_delete_job: deleteJob,
  jenkins_get_job_config: getJobConfig,
  jenkins_list_nodes: listNodes,
  jenkins_get_system_info: getSystemInfo,
  jenkins_get_version: getVersion,
  jenkins_get_plugins: getPlugins,
  jenkins_create_job: createJob,
  jenkins_update_job_config: updateJobConfig,
  jenkins_rename_job: renameJob,
  jenkins_copy_job: copyJob,
  jenkins_get_node: getNode,
  jenkins_toggle_node_offline: toggleNodeOffline,
  jenkins_list_views: listViews,
  jenkins_get_view: getView,
  jenkins_quiet_down: quietDown,
  jenkins_cancel_quiet_down: cancelQuietDown,
  jenkins_safe_restart: safeRestart,
}

// Parse CLI arguments
const parseCliArgs = (): CliArgs => {
  const args: CliArgs = {}
  const argv = process.argv.slice(2)

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const nextArg = argv[i + 1]

    switch (arg) {
      case "--url":
        if (nextArg && !nextArg.startsWith("--")) {
          args.jenkinsUrl = nextArg
          i++
        }
        break
      case "--user":
        if (nextArg && !nextArg.startsWith("--")) {
          args.jenkinsUser = nextArg
          i++
        }
        break
      case "--api-token":
        if (nextArg && !nextArg.startsWith("--")) {
          args.jenkinsApiToken = nextArg
          i++
        }
        break
      case "--bearer-token":
        if (nextArg && !nextArg.startsWith("--")) {
          args.jenkinsBearerToken = nextArg
          i++
        }
        break
      case "--anonymous":
        args.jenkinsAnonymous = true
        break
      case "--transport":
        if (nextArg && !nextArg.startsWith("--")) {
          const transport = nextArg.toLowerCase()
          if (transport === "stdio" || transport === "http") {
            args.transport = transport
            i++
          } else {
            throw new Error(
              `Invalid transport "${nextArg}". Expected one of: stdio, http`,
            )
          }
        }
        break
      case "--port":
        if (nextArg && !nextArg.startsWith("--")) {
          const port = Number(nextArg)
          if (!Number.isInteger(port) || port <= 0 || port > 65535) {
            throw new Error(`Invalid port "${nextArg}". Expected a number from 1 to 65535`)
          }
          args.port = port
          i++
        }
        break
      case "--host":
        if (nextArg && !nextArg.startsWith("--")) {
          args.host = nextArg
          i++
        }
        break
      case "--path":
        if (nextArg && !nextArg.startsWith("--")) {
          args.path = nextArg.startsWith("/") ? nextArg : `/${nextArg}`
          i++
        }
        break
      case "--help":
      case "-h":
        console.log(`
Jenkins MCP Server

Usage: mcp-jenkins [OPTIONS]

Configuration Priority (highest to lowest):
  1. CLI arguments (--url, --user, etc.)
  2. MCP_JENKINS_* environment variables

Options:
  --url <url>            Jenkins server URL
  --user <username>      Jenkins username (for Basic auth)
  --api-token <token>    Jenkins API token (for Basic auth)
  --bearer-token <token> Jenkins bearer token (OAuth/token auth)
  --anonymous            No-auth Jenkins instance (no credentials required)
  --transport <mode>      stdio (default) or http
  --port <port>           HTTP port when using --transport http
  --host <host>           HTTP host when using --transport http
  --path <path>           MCP HTTP path (default: /mcp)
  -h, --help             Show this help message

Authentication:
  Either provide --bearer-token OR both --user and --api-token
  OR use --anonymous for Jenkins instances with no authentication

Tool Filtering (via environment variables):
  MCP_JENKINS_ALLOW_TOOLS=<tool1>,<tool2>  Allowlist — expose only these tools
  MCP_JENKINS_BLOCK_TOOLS=<tool1>,<tool2>  Blocklist — hide these tools
  If both are set, MCP_JENKINS_ALLOW_TOOLS takes precedence.

Examples:
  # Bearer token auth (via CLI)
  mcp-jenkins --url https://jenkins.example.com --bearer-token abc123

  # Basic auth (via CLI)
  mcp-jenkins --url https://jenkins.example.com --user admin --api-token xyz789

  # Mixed (CLI + env vars)
  MCP_JENKINS_USER=admin mcp-jenkins --url https://jenkins.example.com --api-token xyz789

  # Environment variables only
  MCP_JENKINS_URL=https://jenkins.example.com \\
  MCP_JENKINS_BEARER_TOKEN=abc123 \\
  mcp-jenkins

  # Read-only monitoring (block all write tools)
  MCP_JENKINS_BLOCK_TOOLS=jenkins_trigger_build,jenkins_stop_build,jenkins_delete_build,jenkins_cancel_queue,jenkins_enable_job,jenkins_disable_job,jenkins_delete_job,jenkins_create_job,jenkins_update_job_config,jenkins_rename_job,jenkins_copy_job,jenkins_toggle_node_offline,jenkins_quiet_down,jenkins_cancel_quiet_down,jenkins_safe_restart,jenkins_replay_build \\
  mcp-jenkins --url https://jenkins.example.com --bearer-token abc123

  # Allowlist — expose only job listing and status tools
  MCP_JENKINS_ALLOW_TOOLS=jenkins_list_jobs,jenkins_get_job_status,jenkins_get_build_status \\
  mcp-jenkins --url https://jenkins.example.com --bearer-token abc123

  # HTTP server
  mcp-jenkins --transport http --host 127.0.0.1 --port 3000 --url https://jenkins.example.com --bearer-token abc123
`)
        process.exit(0)
        break
    }
  }

  return args
}

// Parse CLI args and build per-instance client map
const cliArgs = parseCliArgs()
const clients = new Map<string, JenkinsClient>()
let defaultInstance: string

try {
  const instances = loadAllJenkinsInstances(cliArgs)
  for (const [name, env] of instances) {
    const authHeader = env.JENKINS_ANONYMOUS
      ? undefined
      : env.JENKINS_BEARER_TOKEN
        ? "Bearer " + env.JENKINS_BEARER_TOKEN
        : "Basic " +
          Buffer.from(`${env.JENKINS_USER}:${env.JENKINS_API_TOKEN}`).toString(
            "base64",
          )
    clients.set(
      name,
      new JenkinsClient({ baseUrl: env.JENKINS_URL, authHeader }),
    )
    logger.info("Jenkins client initialized", {
      instance: name,
      url: env.JENKINS_URL,
      authType: env.JENKINS_ANONYMOUS
        ? "anonymous"
        : env.JENKINS_BEARER_TOKEN
          ? "bearer"
          : "basic",
    })
  }
  defaultInstance = instances.keys().next().value as string
} catch (error: any) {
  logger.error("Failed to initialize Jenkins clients", { error: error.message })
  process.exit(1)
}

const resolveClient = (instance?: string): JenkinsClient => {
  const name = instance ?? defaultInstance
  const c = clients.get(name)
  if (!c)
    throw new McpError(
      "INVALID_PARAMS",
      `Unknown instance "${name}". Available: ${Array.from(clients.keys()).join(", ")}`,
      400,
  )
  return c
}

type TransportMode = "stdio" | "http"

type HttpSession = {
  server: McpServer
  transport: StreamableHTTPServerTransport
}

const getTransportMode = (): TransportMode => {
  const rawMode =
    cliArgs.transport ?? (process.env["MCP_JENKINS_TRANSPORT"] || "stdio")
  const mode = rawMode.toLowerCase()
  if (mode === "stdio" || mode === "http") return mode

  throw new Error(
    `Invalid MCP transport "${rawMode}". Expected one of: stdio, http`,
  )
}

const getHttpConfig = () => {
  const rawPort =
    cliArgs.port ?? Number(process.env["MCP_JENKINS_PORT"] ?? "3000")
  if (!Number.isInteger(rawPort) || rawPort <= 0 || rawPort > 65535) {
    throw new Error(
      `Invalid HTTP port "${String(rawPort)}". Expected a number from 1 to 65535`,
    )
  }

  const host = cliArgs.host ?? process.env["MCP_JENKINS_HOST"] ?? "127.0.0.1"
  const path = cliArgs.path ?? process.env["MCP_JENKINS_PATH"] ?? "/mcp"

  return {
    host,
    port: rawPort,
    path: path.startsWith("/") ? path : `/${path}`,
  }
}

const createMcpServer = (): McpServer => {
  const server = new McpServer(
    {
      name: "jenkins-mcp-server",
      version: "0.9.1",
    },
    {
      capabilities: {},
    },
  )

  for (const tool of filteredRawTools) {
    const inputSchema = buildToolInputSchema(tool.inputSchema)

    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema,
      },
      async (args) => {
        try {
          if (tool.name === "jenkins_list_instances") {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    Array.from(clients.entries()).map(([instanceName, c]) => ({
                      name: instanceName,
                      url: c.baseUrl,
                    })),
                    null,
                    2,
                  ),
                },
              ],
            }
          }

          const handler = toolHandlers[tool.name]
          if (!handler) {
            throw new McpError("TOOL_NOT_FOUND", `Unknown tool: ${tool.name}`, 404)
          }

          const { instance, ...toolArgs } = (args || {}) as Record<string, any>
          const client = resolveClient(instance)
          const result = await handler(client, toolArgs)

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        } catch (error: any) {
          logger.error("Tool execution failed", {
            tool: tool.name,
            error: error.message,
            code: error.code,
          })

          if (error instanceof McpError) {
            throw error
          }

          throw new McpError(
            "EXECUTION_ERROR",
            error.message || "Tool execution failed",
            500,
          )
        }
      },
    )
  }

  return server
}

const createHttpSession = (sessions: Map<string, HttpSession>): HttpSession => {
  const server = createMcpServer()
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      sessions.set(sessionId, { server, transport })
    },
  })

  transport.onclose = () => {
    const sid = transport.sessionId
    if (sid) {
      sessions.delete(sid)
    }
  }

  return { server, transport }
}

const handleStreamableHttpRequest = async (
  req: Request,
  res: Response,
  sessions: Map<string, HttpSession>,
) => {
  const sessionHeader = req.headers["mcp-session-id"]
  const sessionId = Array.isArray(sessionHeader)
    ? sessionHeader[0]
    : sessionHeader

  let session = sessionId ? sessions.get(sessionId) : undefined

  if (session) {
    await session.transport.handleRequest(req, res, req.body)
    return
  }

  if (req.method === "POST" && isInitializeRequest(req.body)) {
    session = createHttpSession(sessions)
    await session.server.connect(session.transport)
    await session.transport.handleRequest(req, res, req.body)
    return
  }

  res.status(400).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Bad Request: No valid session ID provided",
    },
    id: null,
  })
}

async function startStdioServer() {
  const server = createMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  logger.info("Jenkins MCP server running on stdio")
}

async function startHttpServer() {
  const { host, port, path } = getHttpConfig()
  const app = createMcpExpressApp({ host })
  const sessions = new Map<string, HttpSession>()

  app.all(path, async (req, res) => {
    try {
      await handleStreamableHttpRequest(req, res, sessions)
    } catch (error: any) {
      logger.error("HTTP transport error", { error: String(error?.message || error) })
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        })
      }
    }
  })

  app.listen(port, host, () => {
    logger.info("Jenkins MCP server running on HTTP", {
      host,
      port,
      path,
      protocol: "streamable-http",
    })
  })
}

async function main() {
  const transportMode = getTransportMode()

  if (transportMode === "stdio") {
    await startStdioServer()
    return
  }

  await startHttpServer()
}

main().catch((error) => {
  logger.error("Fatal server error", { error: String(error) })
  process.exit(1)
})
