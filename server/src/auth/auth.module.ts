import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { UserModule } from '../user/user.module';

/**
 * AuthModule — provides AuthGuard for route protection across the app.
 * Imports UserModule so the guard can upsert users on first login.
 */
@Module({
  imports: [UserModule],
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
