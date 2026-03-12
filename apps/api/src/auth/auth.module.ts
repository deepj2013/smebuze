import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Company } from '../tenant/entities/company.entity';
import { Department } from '../tenant/entities/department.entity';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { UserRole } from './entities/user-role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { PendingInvite } from './entities/pending-invite.entity';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'change-me-in-prod',
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN') || '8h',
        },
      }),
    }),
    TypeOrmModule.forFeature([
      Tenant,
      Company,
      Department,
      User,
      Role,
      Permission,
      UserRole,
      RolePermission,
      PasswordResetToken,
      PendingInvite,
    ]),
    AuditModule,
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  controllers: [AuthController],
  exports: [TypeOrmModule, PassportModule, JwtModule, AuthService, JwtAuthGuard],
})
export class AuthModule {}
