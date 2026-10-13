import { CartPage } from '../../components/cart-page';
import { getStorefrontBootstrap } from '../../lib/commerce';
export const dynamic='force-dynamic';
export default async function Cart(){const {store,products}=await getStorefrontBootstrap();return <CartPage store={store} products={products}/>;}
