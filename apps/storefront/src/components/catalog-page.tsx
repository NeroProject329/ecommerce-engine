'use client';

import { useEffect, useMemo, useState } from 'react';
import { publicApi, STORE_SLUG, type Category, type Product, type SearchResult, type Store } from '../lib/commerce';
import { Breadcrumbs, PageFrame } from './chrome';
import { ProductCard } from './product-card';

type CatalogPageProps = { store: Store; categories: Category[]; initialProducts: Product[]; query?: string; categorySlug?: string };

export function CatalogPage({ store, categories, initialProducts, query = '', categorySlug }: CatalogPageProps) {
  const category = categories.find((item)=>item.slug===categorySlug);
  const [products,setProducts]=useState(initialProducts);
  const [loading,setLoading]=useState(true);
  const [page,setPage]=useState(1);
  const [totalPages,setTotalPages]=useState(1);
  const [brand,setBrand]=useState('');
  const [sort,setSort]=useState('relevance');
  const [minPrice,setMinPrice]=useState('');
  const [maxPrice,setMaxPrice]=useState('');
  const brands=useMemo(()=>[...new Set(initialProducts.map((product)=>product.brand?.name).filter((name):name is string=>Boolean(name)))],[initialProducts]);
  useEffect(()=>{
    const params=new URLSearchParams({ q: query, page:String(page), limit:'20', sort });
    if(categorySlug) params.set('category',categorySlug);
    if(brand) params.set('brand',brand);
    if(minPrice) params.set('minPriceCents',String(Math.round(Number(minPrice)*100)));
    if(maxPrice) params.set('maxPriceCents',String(Math.round(Number(maxPrice)*100)));
    setLoading(true);
    void publicApi<SearchResult>(`/v1/public/stores/${STORE_SLUG}/search?${params}`).then((result)=>{setProducts(result.items);setTotalPages(result.totalPages);}).catch(()=>{
      const needle=query.toLocaleLowerCase('pt-BR');
      setProducts(initialProducts.filter((product)=>(!categorySlug||product.primaryCategory.slug===categorySlug)&&(!needle||`${product.title} ${product.description}`.toLocaleLowerCase('pt-BR').includes(needle))));
      setTotalPages(1);
    }).finally(()=>setLoading(false));
  },[brand,categorySlug,initialProducts,maxPrice,minPrice,page,query,sort]);
  const title=category?.name ?? (query ? `Resultados para “${query}”` : 'Ofertas imperdíveis!');
  return <PageFrame store={store} categories={categories}><main className="catalog-page container"><Breadcrumbs items={[{label:title}]}/><h1>{title}</h1><div className="catalog-layout"><aside className="filters"><h2>{category?.name ?? 'Todos os departamentos'}</h2><span>{products.length} produtos encontrados</span><details open><summary>Preço</summary><div className="price-fields"><label>De<input type="number" value={minPrice} onChange={(event)=>setMinPrice(event.target.value)} placeholder="R$ 0"/></label><label>Até<input type="number" value={maxPrice} onChange={(event)=>setMaxPrice(event.target.value)} placeholder="R$ 20.000"/></label></div></details><details open><summary>Marca</summary>{brands.map((item)=><label className="filter-check" key={item}><input type="radio" name="brand" checked={brand===item} onChange={()=>setBrand(item)}/>{item}</label>)}<button className="clear-filter" onClick={()=>setBrand('')}>Limpar marca</button></details><details open><summary>Desconto</summary><label className="filter-check"><input type="checkbox"/>Acima de 30%</label><label className="filter-check"><input type="checkbox"/>Até 10%</label></details></aside><section className="catalog-results"><div className="sort-row"><span>{products.length} produtos nesta página</span><label>Ordenar por<select value={sort} onChange={(event)=>setSort(event.target.value)}><option value="relevance">Mais relevantes</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="newest">Mais recentes</option></select></label></div>{loading ? <div className="catalog-grid">{Array.from({length:8},(_,i)=><div className="product-skeleton" key={i}/>)}</div> : products.length ? <div className="catalog-grid">{products.map((product)=><ProductCard key={product.id} product={product}/>)}</div> : <div className="catalog-empty"><strong>Nenhum produto encontrado</strong><p>Altere os filtros ou publique produtos no painel administrativo.</p></div>}<div className="pagination"><button disabled={page===1} onClick={()=>setPage((value)=>value-1)}>Anterior</button><span>Página {page} de {totalPages}</span><button disabled={page>=totalPages} onClick={()=>setPage((value)=>value+1)}>Próxima</button></div></section></div></main></PageFrame>;
}
