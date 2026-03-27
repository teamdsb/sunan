import { JssdkSignatureService } from 'src/modules/wecom/jssdk-signature.service';

describe('JssdkSignatureService', () => {
  it('builds stable sha1 signatures', () => {
    const signature = JssdkSignatureService.buildSignature({
      jsapiTicket: 'ticket-123',
      nonceStr: 'nonce-abc',
      timestamp: 1_705_300_000,
      url: 'https://example.com/my?page=1',
    });

    expect(signature).toBe('a48b0ed1656dd3d4ee6fdedae1547be3abcb5f2b');
  });
});
