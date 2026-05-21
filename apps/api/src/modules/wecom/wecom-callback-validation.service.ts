import { BadRequestException, Injectable } from '@nestjs/common';
import { createDecipheriv, createHash } from 'crypto';

import { appEnv } from 'src/config/env';

export interface WecomCallbackVerifyInput {
  signature?: string | null;
  msgSignature?: string | null;
  timestamp?: string | null;
  nonce?: string | null;
  echoStr?: string | null;
}

interface VerifyEchoOptions {
  signature?: string | null;
  timestamp: string;
  nonce: string;
  echoStr: string;
  token: string;
  encodingAesKey?: string | null;
  corpId: string;
  signatureRequired: boolean;
}

@Injectable()
export class WecomCallbackValidationService {
  verifyUrl(input: WecomCallbackVerifyInput): string {
    const signature = input.msgSignature ?? input.signature ?? null;
    if (!input.echoStr) {
      throw new BadRequestException('missing echostr');
    }
    if (!input.timestamp || !input.nonce) {
      throw new BadRequestException('missing timestamp or nonce');
    }

    return WecomCallbackValidationService.verifyEcho({
      signature,
      timestamp: input.timestamp,
      nonce: input.nonce,
      echoStr: input.echoStr,
      token: appEnv.WECOM_CALLBACK_TOKEN,
      encodingAesKey: appEnv.WECOM_ENCODING_AES_KEY,
      corpId: appEnv.WECOM_CORP_ID,
      signatureRequired: appEnv.WECOM_CALLBACK_SIGNATURE_REQUIRED,
    });
  }

  static verifyEcho(options: VerifyEchoOptions): string {
    if (options.signatureRequired || options.signature) {
      if (!options.signature) {
        throw new BadRequestException('missing callback signature');
      }

      const expected = WecomCallbackValidationService.buildSignature(
        options.token,
        options.timestamp,
        options.nonce,
        options.echoStr,
      );
      if (expected !== options.signature.trim()) {
        throw new BadRequestException('invalid callback signature');
      }
    }

    if (!options.encodingAesKey) {
      return options.echoStr;
    }

    return WecomCallbackValidationService.decryptEchoStr(
      options.echoStr,
      options.encodingAesKey,
      options.corpId,
    );
  }

  static buildSignature(token: string, timestamp: string, nonce: string, payload: string): string {
    return createHash('sha1').update([token, timestamp, nonce, payload].sort().join('')).digest('hex');
  }

  static decryptEchoStr(echoStr: string, encodingAesKey: string, corpId: string): string {
    const aesKey = WecomCallbackValidationService.decodeAesKey(encodingAesKey);
    const decipher = createDecipheriv('aes-256-cbc', aesKey, aesKey.subarray(0, 16));
    decipher.setAutoPadding(false);

    const decrypted = Buffer.concat([decipher.update(echoStr, 'base64'), decipher.final()]);
    const plain = WecomCallbackValidationService.removePkcs7Padding(decrypted);
    if (plain.length < 20) {
      throw new BadRequestException('invalid encrypted echo string');
    }

    const messageLength = plain.readUInt32BE(16);
    const messageStart = 20;
    const messageEnd = messageStart + messageLength;
    if (messageEnd > plain.length) {
      throw new BadRequestException('invalid encrypted echo length');
    }

    const message = plain.subarray(messageStart, messageEnd).toString('utf8');
    const receivedCorpId = plain.subarray(messageEnd).toString('utf8');
    if (receivedCorpId && receivedCorpId !== corpId) {
      throw new BadRequestException('invalid callback corp id');
    }

    return message;
  }

  private static decodeAesKey(encodingAesKey: string): Buffer {
    if (encodingAesKey.length !== 43) {
      throw new BadRequestException('invalid EncodingAESKey length');
    }

    const aesKey = Buffer.from(`${encodingAesKey}=`, 'base64');
    if (aesKey.length !== 32) {
      throw new BadRequestException('invalid EncodingAESKey');
    }
    return aesKey;
  }

  private static removePkcs7Padding(input: Buffer): Buffer {
    if (input.length === 0) {
      throw new BadRequestException('invalid encrypted echo padding');
    }

    const padding = input.at(-1);
    if (padding === undefined) {
      throw new BadRequestException('invalid encrypted echo padding');
    }
    if (padding < 1 || padding > 32 || padding > input.length) {
      throw new BadRequestException('invalid encrypted echo padding');
    }

    return input.subarray(0, input.length - padding);
  }
}
