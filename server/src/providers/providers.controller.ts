import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProviderRouterService } from './provider-router.service';

@ApiTags('providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly router: ProviderRouterService) {}

  @Get()
  @ApiOperation({
    summary:
      'List all active (configured) translation providers in priority order',
  })
  listProviders(): { providers: string[] } {
    return { providers: this.router.listAll() };
  }
}
