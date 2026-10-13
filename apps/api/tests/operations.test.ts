import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AdminAuthService } from '../src/auth/admin-auth.service';
import { OperationsController } from '../src/operations/operations.controller';
import { OperationsService } from '../src/operations/operations.service';

describe('operations endpoints', () => {
  let app: NestFastifyApplication;
  const operations = { summary: vi.fn(async()=>({orders:2})), orders: vi.fn(async()=>[]), customer: vi.fn(async()=>({id:'customer-1',addresses:[]})), customers: vi.fn(async()=>({items:[]})), imports: vi.fn(async()=>[]), audit: vi.fn(async()=>[]) };
  const auth = { authorize: vi.fn(async()=>({adminUserId:'admin'})) };
  beforeAll(async()=>{const moduleRef=await Test.createTestingModule({controllers:[OperationsController],providers:[{provide:OperationsService,useValue:operations},{provide:AdminAuthService,useValue:auth}]}).compile();app=moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(),{logger:false});await app.init();await app.getHttpAdapter().getInstance().ready();});
  afterAll(async()=>app.close());
  it('returns tenant-scoped dashboard metrics',async()=>{const response=await app.inject({method:'GET',url:'/v1/admin/stores/store-1/operations/summary',headers:{authorization:'Bearer token'}});expect(response.statusCode).toBe(200);expect(response.json()).toMatchObject({data:{orders:2}});expect(auth.authorize).toHaveBeenCalledWith('token','store-1','catalog:read',false);});
  it('uses domain-specific read permission for orders',async()=>{const response=await app.inject({method:'GET',url:'/v1/admin/stores/store-1/operations/orders',headers:{authorization:'Bearer token'}});expect(response.statusCode).toBe(200);expect(auth.authorize).toHaveBeenCalledWith('token','store-1','orders:read',false);});
  it('returns a tenant-scoped customer detail',async()=>{const response=await app.inject({method:'GET',url:'/v1/admin/stores/store-1/operations/customers/customer-1',headers:{authorization:'Bearer token'}});expect(response.statusCode).toBe(200);expect(response.json()).toMatchObject({data:{id:'customer-1',addresses:[]}});expect(operations.customer).toHaveBeenCalledWith('store-1','customer-1');expect(auth.authorize).toHaveBeenCalledWith('token','store-1','customers:read',false);});
});
