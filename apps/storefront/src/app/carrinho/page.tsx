import { CartPage } from '../../components/cart-page';
import { cartRecommendations } from '../../lib/cart-template-data';
import { getStorefrontBootstrap } from '../../lib/commerce';
import { referenceProduct } from '../../lib/product-detail-template-data';
export const dynamic='force-dynamic';
export default async function Cart(){const {store,products}=await getStorefrontBootstrap();return <CartPage store={store} products={[referenceProduct,...products.filter((product)=>product.id!==referenceProduct.id)]} recommendations={cartRecommendations}/>;}
