declare module 'ali-oss' {
  interface SignatureUrlOptions {
    method?: 'GET' | 'PUT';
    expires?: number;
    headers?: Record<string, string>;
  }

  interface PutOptions {
    headers?: Record<string, string>;
  }

  export default class OSS {
    constructor(options: {
      region: string;
      bucket: string;
      accessKeyId: string;
      accessKeySecret: string;
    });

    signatureUrl(name: string, options?: SignatureUrlOptions): string;

    head(name: string): Promise<{ res: { headers: Record<string, string> } }>;
    get(name: string): Promise<{ content: Buffer }>;

    getBucketInfo(name: string): Promise<unknown>;

    put(name: string, file: Buffer, options?: PutOptions): Promise<unknown>;
  }
}
