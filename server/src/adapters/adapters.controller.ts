import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdapterRegistryService } from './adapter-registry.service';

@ApiTags('adapters')
@Controller('adapters')
export class AdaptersController {
  constructor(private readonly registry: AdapterRegistryService) {}

  @Get()
  @ApiOperation({ summary: 'List all registered framework adapters' })
  listAdapters(): { adapters: string[] } {
    return { adapters: this.registry.listAll() };
  }
}
