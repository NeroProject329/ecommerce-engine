import { ProtectionPage } from '../../components/protection-page';
import { getStorefrontBootstrap } from '../../lib/commerce';
export const dynamic='force-dynamic';
export default async function Protection(){const {store}=await getStorefrontBootstrap();return <ProtectionPage store={store}/>;}
