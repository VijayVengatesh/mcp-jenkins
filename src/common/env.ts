export interface JenkinsEnv {
  JENKINS_URL: string;
  JENKINS_USER?: string;
  JENKINS_API_TOKEN?: string;
  JENKINS_BEARER_TOKEN?: string;
}

export interface CliArgs {
  jenkinsUrl?: string;
  jenkinsUser?: string;
  jenkinsApiToken?: string;
  jenkinsBearerToken?: string;
}

// Store resolved config globally to avoid re-parsing CLI args
let cachedEnv: JenkinsEnv | null = null;

/**
 * Get a configuration value with priority:
 * 1. CLI argument (highest priority)
 * 2. MCP_JENKINS_* environment variable (medium priority)
 * 3. JENKINS_* environment variable (lowest priority)
 */
const getConfigValue = (
  cliValue: string | undefined,
  mcpEnvKey: string,
  jenkinsEnvKey: string
): string | undefined => {
  if (cliValue !== undefined) {
    return cliValue;
  }
  const mcpValue = process.env[mcpEnvKey];
  if (mcpValue !== undefined) {
    return mcpValue;
  }
  return process.env[jenkinsEnvKey];
};

export const loadJenkinsEnv = (cliArgs?: CliArgs): JenkinsEnv => {
  // Return cached env if available and no CLI args provided
  if (cachedEnv && !cliArgs) {
    return cachedEnv;
  }

  // Get values with priority order
  const JENKINS_URL = getConfigValue(
    cliArgs?.jenkinsUrl,
    'MCP_JENKINS_URL',
    'JENKINS_URL'
  );

  const JENKINS_USER = getConfigValue(
    cliArgs?.jenkinsUser,
    'MCP_JENKINS_USER',
    'JENKINS_USER'
  );

  const JENKINS_API_TOKEN = getConfigValue(
    cliArgs?.jenkinsApiToken,
    'MCP_JENKINS_API_TOKEN',
    'JENKINS_API_TOKEN'
  );

  const JENKINS_BEARER_TOKEN = getConfigValue(
    cliArgs?.jenkinsBearerToken,
    'MCP_JENKINS_BEARER_TOKEN',
    'JENKINS_BEARER_TOKEN'
  );

  if (!JENKINS_URL) {
    throw new Error('Missing JENKINS_URL. Provide via:\n' +
      '  1. CLI: --jenkins-url <url>\n' +
      '  2. Environment: MCP_JENKINS_URL=<url>\n' +
      '  3. Environment: JENKINS_URL=<url>');
  }

  // Either bearer token OR (user + api token) must be provided
  const hasBasicAuth = JENKINS_USER && JENKINS_API_TOKEN;
  const hasBearerAuth = JENKINS_BEARER_TOKEN;
  if (!hasBasicAuth && !hasBearerAuth) {
    throw new Error('Missing Jenkins authentication. Provide via:\n' +
      '  Bearer Token:\n' +
      '    1. CLI: --jenkins-bearer-token <token>\n' +
      '    2. Environment: MCP_JENKINS_BEARER_TOKEN=<token>\n' +
      '    3. Environment: JENKINS_BEARER_TOKEN=<token>\n' +
      '  OR Basic Auth:\n' +
      '    1. CLI: --jenkins-user <user> --jenkins-api-token <token>\n' +
      '    2. Environment: MCP_JENKINS_USER=<user> MCP_JENKINS_API_TOKEN=<token>\n' +
      '    3. Environment: JENKINS_USER=<user> JENKINS_API_TOKEN=<token>');
  }

  const env = {
    JENKINS_URL: JENKINS_URL.replace(/\/$/, ''),
    JENKINS_USER,
    JENKINS_API_TOKEN,
    JENKINS_BEARER_TOKEN
  };

  // Cache the resolved config
  if (cliArgs) {
    cachedEnv = env;
  }

  return env;
};
