import { checkDatabaseHealth } from '@ecommerce/database';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DatabaseHealthService {
  check() {
    return checkDatabaseHealth();
  }
}
