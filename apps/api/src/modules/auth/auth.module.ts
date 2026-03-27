import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { appEnv } from 'src/config/env';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';
import { RoleResolverService } from 'src/modules/auth/role-resolver.service';
import { JwtStrategy } from 'src/modules/auth/strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([WecomUserEntity]),
    PassportModule,
    JwtModule.register({
      secret: appEnv.JWT_SECRET,
      signOptions: {
        expiresIn: appEnv.JWT_EXPIRES_IN,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RoleResolverService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
