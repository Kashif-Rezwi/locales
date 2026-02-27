import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DatabaseModule } from '../database/database.module';

/**
 * UserModule — manages user accounts persisted in the database.
 * Exports UserService so AuthGuard (in AuthModule) can upsert users.
 */
@Module({
  imports: [DatabaseModule],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
