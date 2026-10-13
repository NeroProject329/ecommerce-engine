import Link from 'next/link';
import { PageFrame } from '../../components/chrome';
import { getStorefrontBootstrap } from '../../lib/commerce';
export const dynamic='force-dynamic';
export default async function Departments(){const {store,categories}=await getStorefrontBootstrap();return <PageFrame store={store} categories={categories}><main className="simple-page container"><h1>Departamentos</h1><div className="department-grid">{categories.map((category)=><Link href={`/categoria/${category.slug}`} key={category.id}><span>▣</span><strong>{category.name}</strong><small>Ver produtos →</small></Link>)}</div></main></PageFrame>;}
