import { CategoryTemplatePage } from '../../../components/category-template-page';
import { getStorefrontBootstrap } from '../../../lib/commerce';
export const dynamic='force-dynamic';
export default async function CategoryPage({params}:{params:Promise<{slug:string}>}){const [{slug},{store,categories,products}]=await Promise.all([params,getStorefrontBootstrap()]);return <CategoryTemplatePage store={store} categories={categories} initialProducts={products} categorySlug={slug}/>;}
