import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { JwtPayload } from './jwt.payload';

@Injectable()
export class JwtService {
  createToken(payload: JwtPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
  }
}
