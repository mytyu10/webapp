import { Injectable } from '@nestjs/common';
import { createHash, BinaryToTextEncoding } from 'crypto';

@Injectable()

export class HashService {
    private readonly ALGORITHM: string =  'sha256';
    private  readonly DigestEncoding = {
        HEX: 'hex',
        BASE64: 'base64',
    } as const satisfies Record<string, BinaryToTextEncoding>;
    
    createHash(value: string): string {
        return createHash(this.ALGORITHM).update(value).digest(this.DigestEncoding.HEX);
    }
}