interface EnvShape {
  apiBaseUrl: string;
  wecomCorpId: string;
  wecomAgentId: string;
  wecomRedirectUri: string;
}

function getEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

export const env: EnvShape = {
  apiBaseUrl: getEnv('VITE_API_BASE_URL'),
  wecomCorpId: getEnv('VITE_WECOM_CORP_ID'),
  wecomAgentId: getEnv('VITE_WECOM_AGENT_ID'),
  wecomRedirectUri: getEnv('VITE_WECOM_REDIRECT_URI'),
};
