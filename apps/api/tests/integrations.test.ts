import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AdminAuthService } from '../src/auth/admin-auth.service';
import { CustomerAuthService } from '../src/auth/customer-auth.service';
import { ImportsService } from '../src/imports/imports.service';
import { AdminIntegrationsController, CatalogIntegrationController, CustomerConsentController } from '../src/integrations/integrations.controller';
import { IntegrationsService } from '../src/integrations/integrations.service';

describe('integration and consent endpoints',()=>{
  let app:NestFastifyApplication;
  const integrations={createClient:vi.fn(async()=>({clientId:'id',clientSecret:'secret'})),rotateClient:vi.fn(),listConsents:vi.fn(async()=>[]),authorizeClient:vi.fn(async()=>({storeId:'store-1'})),recordConsent:vi.fn(async()=>({id:'consent-1'}))};
  const adminAuth={authorize:vi.fn(async()=>({adminUserId:'admin-1'}))}; const customerAuth={authorize:vi.fn(async()=>({customerId:'customer-1',storeId:'store-1'}))}; const imports={submit:vi.fn(),report:vi.fn(async()=>({id:'batch-1'}))};
  beforeAll(async()=>{const moduleRef=await Test.createTestingModule({controllers:[AdminIntegrationsController,CatalogIntegrationController,CustomerConsentController],providers:[{provide:IntegrationsService,useValue:integrations},{provide:AdminAuthService,useValue:adminAuth},{provide:CustomerAuthService,useValue:customerAuth},{provide:ImportsService,useValue:imports}]}).compile();app=moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(),{logger:false});await app.init();await app.getHttpAdapter().getInstance().ready();});afterAll(async()=>app.close());
  it('creates an M2M client behind sensitive admin authorization',async()=>{const response=await app.inject({method:'POST',url:'/v1/admin/stores/store-1/integrations/clients',headers:{authorization:'Bearer token'},payload:{name:'Collector',scopes:['catalog:read']}});expect(response.statusCode).toBe(201);expect(adminAuth.authorize).toHaveBeenCalledWith('token','store-1','settings:write');expect(response.json()).toMatchObject({data:{clientSecret:'secret'}});});
  it('authorizes M2M batch reads with dedicated headers',async()=>{const response=await app.inject({method:'GET',url:'/v1/integrations/catalog/batches/batch-1',headers:{'x-client-id':'id','x-client-secret':'secret'}});expect(response.statusCode).toBe(200);expect(integrations.authorizeClient).toHaveBeenCalledWith('id','secret','catalog:read');});
  it('records a versioned customer consent',async()=>{const response=await app.inject({method:'POST',url:'/v1/customer/stores/loja/consents',headers:{authorization:'Bearer customer-token'},payload:{purpose:'marketing',channel:'email',granted:true,version:'v1'}});expect(response.statusCode).toBe(201);expect(integrations.recordConsent).toHaveBeenCalledWith('loja','customer-token',expect.objectContaining({granted:true}),expect.any(Function));});
});
