import { ProtectionPage } from '../../components/protection-page';
import { getStorefrontBootstrap, publicApi, STORE_SLUG, type Product } from '../../lib/commerce';
import { demoProducts } from '../../lib/demo-products';
import { findReferenceProduct, referenceProduct } from '../../lib/product-detail-template-data';

export const dynamic = 'force-dynamic';

async function resolveProduct(slug: string | undefined, products: Product[]) {
  if (!slug) return products[0] ?? referenceProduct;
  return publicApi<Product>(`/v1/public/stores/${STORE_SLUG}/products/${slug}`).catch(
    () => findReferenceProduct(slug) ?? demoProducts.find((item) => item.slug === slug) ?? referenceProduct,
  );
}

export default async function Protection({
  searchParams,
}: {
  searchParams: Promise<{ produto?: string }>;
}) {
  const [{ produto }, bootstrap] = await Promise.all([searchParams, getStorefrontBootstrap()]);
  const product = await resolveProduct(produto, bootstrap.products);
  return <ProtectionPage key={product.id} store={bootstrap.store} product={product} />;
}
