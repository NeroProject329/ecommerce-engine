import { CatalogPage } from '../../components/catalog-page';
import { getStorefrontBootstrap } from '../../lib/commerce';
export const dynamic='force-dynamic';
export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string}>}){const [{q=''},{store,categories,products}]=await Promise.all([searchParams,getStorefrontBootstrap()]);return <CatalogPage store={store} categories={categories} initialProducts={products} query={q}/>;}
