import { createCipheriv } from 'crypto';

import { WecomCallbackValidationService } from 'src/modules/wecom/wecom-callback-validation.service';

describe('WecomCallbackValidationService', () => {
  const token = 'callback-token';
  const timestamp = '1780000000';
  const nonce = 'nonce-123';
  const corpId = 'ww-test-corp';
  const encodingAesKey = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

  it('returns plain echostr when signature is valid and AES is not configured', () => {
    const echoStr = 'plain-echo';
    const signature = WecomCallbackValidationService.buildSignature(token, timestamp, nonce, echoStr);

    expect(
      WecomCallbackValidationService.verifyEcho({
        signature,
        timestamp,
        nonce,
        echoStr,
        token,
        corpId,
        signatureRequired: true,
      }),
    ).toBe(echoStr);
  });

  it('rejects invalid signatures', () => {
    expect(() =>
      WecomCallbackValidationService.verifyEcho({
        signature: 'bad-signature',
        timestamp,
        nonce,
        echoStr: 'plain-echo',
        token,
        corpId,
        signatureRequired: true,
      }),
    ).toThrow('invalid callback signature');
  });

  it('decrypts encrypted echostr when EncodingAESKey is configured', () => {
    const encryptedEchoStr = encryptEchoStr('decrypted-echo', encodingAesKey, corpId);
    const signature = WecomCallbackValidationService.buildSignature(token, timestamp, nonce, encryptedEchoStr);

    expect(
      WecomCallbackValidationService.verifyEcho({
        signature,
        timestamp,
        nonce,
        echoStr: encryptedEchoStr,
        token,
        encodingAesKey,
        corpId,
        signatureRequired: true,
      }),
    ).toBe('decrypted-echo');
  });
});

function encryptEchoStr(message: string, encodingAesKey: string, corpId: string): string {
  const aesKey = Buffer.from(`${encodingAesKey}=`, 'base64');
  const random = Buffer.from('1234567890abcdef', 'utf8');
  const messageBytes = Buffer.from(message, 'utf8');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(messageBytes.length);

  const raw = Buffer.concat([random, length, messageBytes, Buffer.from(corpId, 'utf8')]);
  const padded = addPkcs7Padding(raw);
  const cipher = createCipheriv('aes-256-cbc', aesKey, aesKey.subarray(0, 16));
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(padded), cipher.final()]).toString('base64');
}

function addPkcs7Padding(input: Buffer): Buffer {
  const blockSize = 32;
  let padding = blockSize - (input.length % blockSize);
  if (padding === 0) {
    padding = blockSize;
  }
  return Buffer.concat([input, Buffer.alloc(padding, padding)]);
}
