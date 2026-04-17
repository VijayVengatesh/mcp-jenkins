import { describe, it, expect, vi, beforeEach } from "vitest"
import { getJobParameters } from "../../src/tools/get-job-parameters.js"
import { JenkinsClient } from "../../src/lib/jenkins-client.js"

describe("getJobParameters tool", () => {
  let mockClient: JenkinsClient

  beforeEach(() => {
    mockClient = { getJobParameters: vi.fn() } as any
  })

  it("returns empty parameters for a non-parameterised job", async () => {
    vi.mocked(mockClient.getJobParameters).mockResolvedValue({
      jobName: "simple-job",
      parameters: [],
    })

    const result = await getJobParameters(mockClient, { jobName: "simple-job" })

    expect(mockClient.getJobParameters).toHaveBeenCalledWith("simple-job")
    expect(result.parameters).toEqual([])
  })

  it("returns string parameter with default value", async () => {
    vi.mocked(mockClient.getJobParameters).mockResolvedValue({
      jobName: "deploy-job",
      parameters: [
        {
          name: "BRANCH",
          type: "string",
          description: "Branch to deploy",
          defaultValue: "main",
        },
      ],
    })

    const result = await getJobParameters(mockClient, { jobName: "deploy-job" })

    expect(result.parameters).toHaveLength(1)
    expect(result.parameters[0]).toMatchObject({
      name: "BRANCH",
      type: "string",
      defaultValue: "main",
    })
  })

  it("returns choice parameter with choices array", async () => {
    vi.mocked(mockClient.getJobParameters).mockResolvedValue({
      jobName: "env-job",
      parameters: [
        {
          name: "ENVIRONMENT",
          type: "choice",
          description: "Target environment",
          defaultValue: "staging",
          choices: ["staging", "production", "dev"],
        },
      ],
    })

    const result = await getJobParameters(mockClient, { jobName: "env-job" })

    expect(result.parameters[0].choices).toEqual([
      "staging",
      "production",
      "dev",
    ])
  })

  it("returns boolean parameter", async () => {
    vi.mocked(mockClient.getJobParameters).mockResolvedValue({
      jobName: "flag-job",
      parameters: [
        {
          name: "DRY_RUN",
          type: "boolean",
          description: "Skip actual deployment",
          defaultValue: false,
        },
      ],
    })

    const result = await getJobParameters(mockClient, { jobName: "flag-job" })

    expect(result.parameters[0]).toMatchObject({
      name: "DRY_RUN",
      type: "boolean",
      defaultValue: false,
    })
  })

  it("returns multiple mixed parameters", async () => {
    vi.mocked(mockClient.getJobParameters).mockResolvedValue({
      jobName: "multi-job",
      parameters: [
        {
          name: "VERSION",
          type: "string",
          description: "",
          defaultValue: null,
        },
        {
          name: "DEPLOY",
          type: "boolean",
          description: "",
          defaultValue: true,
        },
        {
          name: "ENV",
          type: "choice",
          description: "",
          defaultValue: "staging",
          choices: ["staging", "prod"],
        },
      ],
    })

    const result = await getJobParameters(mockClient, { jobName: "multi-job" })

    expect(result.parameters).toHaveLength(3)
    expect(result.parameters.map((p) => p.name)).toEqual([
      "VERSION",
      "DEPLOY",
      "ENV",
    ])
  })

  it("propagates errors from client", async () => {
    vi.mocked(mockClient.getJobParameters).mockRejectedValue(
      new Error("Job not found: ghost-job"),
    )

    await expect(
      getJobParameters(mockClient, { jobName: "ghost-job" }),
    ).rejects.toThrow("Job not found: ghost-job")
  })
})
