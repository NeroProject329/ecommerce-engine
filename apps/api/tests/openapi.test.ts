import { describe, expect, it } from 'vitest';
import { OpenApiController } from '../src/platform/openapi.controller';

describe('OpenAPI document', () => {
  it('documents the complete API surface and security schemes', () => {
    const document = new OpenApiController().document();
    expect(Object.keys(document.paths).length).toBeGreaterThan(100);
    expect(document.paths).toHaveProperty('/v1/public/address/postal-codes/{postalCode}');
    expect(document.paths).toHaveProperty('/v1/admin/stores/{storeId}/communications/outbox/{id}/retry');
    expect(document.components.securitySchemes).toHaveProperty('bearerAuth');
    expect(document.components.schemas).toHaveProperty('ShippingRule');
  });
});
