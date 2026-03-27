export {};

declare global {
  interface Window {
    wx: {
      config: (params: {
        appId: string;
        timestamp: number;
        nonceStr: string;
        signature: string;
        jsApiList: string[];
      }) => void;
      ready: (callback: () => void) => void;
      error: (callback: (error: unknown) => void) => void;
      agentConfig: (params: {
        corpid: string;
        agentid: string;
        timestamp: number;
        nonceStr: string;
        signature: string;
        jsApiList: string[];
        success: () => void;
        fail: (error: unknown) => void;
      }) => void;
    };
  }

  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_WECOM_CORP_ID: string;
    readonly VITE_WECOM_AGENT_ID: string;
    readonly VITE_WECOM_REDIRECT_URI: string;
  }
}
