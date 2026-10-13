import { Controller, Get, Inject, Param } from '@nestjs/common';
import { AddressLookupService } from './address-lookup.service';

@Controller('v1/public/address')
export class AddressLookupController {
  constructor(@Inject(AddressLookupService) private readonly addresses: AddressLookupService) {}

  @Get('postal-codes/:postalCode')
  async lookup(@Param('postalCode') postalCode: string) { return { data: await this.addresses.lookup(postalCode) }; }
}
