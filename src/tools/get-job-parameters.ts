import { JenkinsClient } from "../lib/jenkins-client.js"

export interface GetJobParametersInput {
  jobName: string
}

export const getJobParameters = async (
  client: JenkinsClient,
  input: GetJobParametersInput,
) => client.getJobParameters(input.jobName)
