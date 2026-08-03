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
      chooseImage: (params: {
        count: number;
        sizeType: string[];
        sourceType: string[];
        success: (result: { localIds: string[] }) => void;
        fail?: (error: unknown) => void;
      }) => void;
      uploadImage: (params: {
        localId: string;
        isShowProgressTips: 0 | 1;
        success: (result: { serverId: string }) => void;
        fail?: (error: unknown) => void;
      }) => void;
      invoke: (
        api: 'thirdPartyOpenPage',
        params: {
          oaType: '10001' | '10002';
          templateId: string;
          thirdNo: string;
          extData?: {
            fieldList?: Array<{
              title: string;
              type: 'text' | 'link';
              value: string;
            }>;
          };
        },
        callback: (result: { err_msg?: string; errMsg?: string; [key: string]: unknown }) => void,
      ) => void;
      previewFile: (params: {
        url: string;
        name: string;
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
