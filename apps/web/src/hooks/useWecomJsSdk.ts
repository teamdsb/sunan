import { useEffect, useState } from 'react';
import { useAppDispatch } from '../app/hooks';
import { env } from '../app/env';
import { useLazyGetJssdkSignatureQuery } from '../features/auth/authApi';
import { setJssdkStatus } from '../features/auth/authSlice';
import { getSignatureUrl } from '../features/auth/oauth';
import type { JssdkSignature } from '../features/auth/types';

export interface UseWecomJsSdkOptions {
  jsApiList: string[];
  agentJsApiList?: string[];
}

interface WxAgentConfigParams {
  corpid: string;
  agentid: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
  jsApiList: string[];
}

interface WxConfigParams {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
  jsApiList: string[];
}

export interface UseWecomJsSdkReturn {
  isReady: boolean;
  error: string | null;
}

const EMPTY_AGENT_API_LIST: string[] = [];

async function waitForReady(config: WxConfigParams): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    window.wx.config(config);
    window.wx.ready(() => resolve());
    window.wx.error((error) => reject(error));
  });
}

async function runAgentConfig(config: WxAgentConfigParams): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    window.wx.agentConfig({
      ...config,
      success: () => resolve(),
      fail: (error) => reject(error),
    });
  });
}

function toCorpConfig(
  signature: JssdkSignature,
  jsApiList: string[],
): WxConfigParams {
  return {
    appId: signature.appId,
    timestamp: signature.timestamp,
    nonceStr: signature.nonceStr,
    signature: signature.signature,
    jsApiList,
  };
}

function toAgentConfig(
  signature: JssdkSignature,
  jsApiList: string[],
): WxAgentConfigParams {
  return {
    corpid: signature.appId,
    agentid: env.wecomAgentId,
    timestamp: signature.timestamp,
    nonceStr: signature.nonceStr,
    signature: signature.signature,
    jsApiList,
  };
}

export function useWecomJsSdk({
  jsApiList,
  agentJsApiList = EMPTY_AGENT_API_LIST,
}: UseWecomJsSdkOptions): UseWecomJsSdkReturn {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const [getSignature] = useLazyGetJssdkSignatureQuery();

  useEffect(() => {
    let mounted = true;

    const initSdk = async () => {
      if (!window.wx) {
        if (mounted) {
          setError('企业微信 JS-SDK 未注入');
          dispatch(setJssdkStatus('failed'));
        }
        return;
      }

      dispatch(setJssdkStatus('loading'));
      setError(null);
      const url = getSignatureUrl();

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const corpSignature = await getSignature({ url, type: 'corp' }).unwrap();
          await waitForReady(toCorpConfig(corpSignature.data, jsApiList));

          if (agentJsApiList.length > 0) {
            const agentSignature = await getSignature({ url, type: 'agent' }).unwrap();
            await runAgentConfig(toAgentConfig(agentSignature.data, agentJsApiList));
          }

          if (mounted) {
            setIsReady(true);
            dispatch(setJssdkStatus('ready'));
          }
          return;
        } catch {
          if (attempt === 1 && mounted) {
            setError('企业微信能力初始化失败，请刷新后重试。');
            setIsReady(false);
            dispatch(setJssdkStatus('failed'));
          }
        }
      }
    };

    void initSdk();

    return () => {
      mounted = false;
    };
  }, [agentJsApiList, dispatch, getSignature, jsApiList]);

  return { isReady, error };
}
