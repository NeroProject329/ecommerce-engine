'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Category } from '../lib/commerce';

const fallbackDepartments = [
  ['USE: CAMPEÃO', 'category-champion.png'],
  ['Queridinhos', 'category-favorites.png'],
  ['iPhone', 'category-iphone.png'],
  ["TV's", 'category-tv.png'],
  ['Móveis', 'category-furniture.png'],
  ['Portáteis', 'category-portables.png'],
  ['Eletrodomésticos', 'category-appliances.png'],
  ['Smartphones', 'category-smartphones.png'],
  ['Ar & Ventilação', 'category-air.png'],
  ['Beleza & Saúde', 'category-beauty.png'],
  ['Ferramentas', 'category-tools.png'],
  ['Automotivo', 'category-automotive.png'],
  ['Informática', 'category-computing.png'],
  ['Games', 'category-games.png'],
  ['Esportes', 'category-sports.png'],
  ['Áudio', 'category-audio.png'],
  ['Wearables', 'category-wearables.png'],
  ['Utensílios', 'category-kitchen.png'],
] as const;

const fallbackBanners: Array<Record<string, unknown>> = ([
  ['hero-search-champions.gif', 'Campeões de busca'],
  ['hero-furniture.png', 'Especial móveis'],
  ['hero-televisions.png', 'Ofertas em TVs'],
  ['hero-smartphones.png', 'Ofertas em smartphones'],
  ['hero-home.png', 'Ofertas para sua casa'],
  ['hero-portables.png', 'Ofertas em eletroportáteis'],
  ['hero-air.png', 'Campeões de frescor'],
] as const).map(([mediaUrl, title], index) => ({
  id: `reference-${index}`,
  title,
  ctaUrl: '/busca?q=ofertas',
  mediaUrl: `/home-assets/${mediaUrl}`,
}));

export function HomeHero({ banners, categories }: { banners: Array<Record<string, unknown>>; categories: Category[] }) {
  const heroBanners = banners.filter((banner)=>banner.placement === 'hero');
  const available = heroBanners.length ? heroBanners : fallbackBanners;
  const [slidePosition,setSlidePosition] = useState(available.length > 1 ? 1 : 0);
  const [heroTransition,setHeroTransition] = useState(true);
  const [paused,setPaused] = useState(false);
  const [departmentPage,setDepartmentPage] = useState(0);
  const active = (slidePosition - 1 + available.length) % available.length;
  const previous = () => { setHeroTransition(true); setSlidePosition((value)=>value-1); };
  const next = () => { setHeroTransition(true); setSlidePosition((value)=>value+1); };
  useEffect(()=>{ if (paused || available.length < 2) return; const timer=setInterval(()=>{ setHeroTransition(true); setSlidePosition((value)=>value+1); },5000); return ()=>clearInterval(timer); },[available.length,paused]);
  const heroSlides = useMemo(() => available.length > 1 ? [available.at(-1)!, ...available, available[0]!] : available, [available]);
  const departments = fallbackDepartments.map(([name, icon], index) => ({
    name,
    icon,
    slug: categories[index]?.slug ?? '',
  }));
  const departmentPageCount = Math.ceil(departments.length/9);
  const departmentPages = Array.from({ length: departmentPageCount }, (_, page) => departments.slice(page * 9, page * 9 + 9));
  const previousDepartments = () => setDepartmentPage((value) => Math.max(0, value - 1));
  const nextDepartments = () => setDepartmentPage((value) => Math.min(departmentPageCount - 1, value + 1));
  return <>
    <section className="home-departments container" aria-label="Departamentos em destaque">
      <button className="department-arrow" type="button" onClick={previousDepartments} aria-label="Departamentos anteriores" disabled={departmentPage === 0}>‹</button>
      <div className="department-carousel-viewport">
        <div className="department-carousel-track" style={{ transform: `translate3d(-${departmentPage * 100}%,0,0)` }}>
          {departmentPages.map((page, pageIndex) => <div className="department-carousel-page" key={pageIndex} aria-hidden={pageIndex !== departmentPage}>
            {page.map((department) => <Link key={department.name} href={department.slug ? `/categoria/${department.slug}` : `/busca?q=${encodeURIComponent(department.name)}`} tabIndex={pageIndex === departmentPage ? undefined : -1}>
              <span><Image src={`/home-assets/${department.icon}`} alt="" width={90} height={90}/></span>{department.name}
            </Link>)}
          </div>)}
        </div>
      </div>
      <button className="department-arrow" type="button" onClick={nextDepartments} aria-label="Próximos departamentos" disabled={departmentPage === departmentPageCount - 1}>›</button>
    </section>
    <section className="hero-banner">
      <div className="hero-carousel-viewport">
        <div
          className="hero-carousel-track"
          data-transition={heroTransition}
          style={{ transform: `translate3d(-${slidePosition * 100}%,0,0)` }}
          onTransitionEnd={() => {
            if (slidePosition === 0) { setHeroTransition(false); setSlidePosition(available.length); }
            if (slidePosition === available.length + 1) { setHeroTransition(false); setSlidePosition(1); }
          }}
        >
          {heroSlides.map((banner,index) => <div className="hero-carousel-slide" key={`${String(banner.id)}-${index}`} aria-hidden={index !== slidePosition}>
            {banner.mediaUrl ? <Link href={String(banner.linkTarget ?? '/busca')} tabIndex={index === slidePosition ? undefined : -1}><Image src={String(banner.mediaUrl)} alt={String(banner.title ?? '')} fill priority={index <= 2} unoptimized/></Link> : <div className="hero-fallback home-sale-collage" />}
          </div>)}
        </div>
      </div>
      {available.length > 1 && <>
        <button className="hero-arrow hero-arrow-previous" type="button" onClick={previous} aria-label="Banner anterior">‹</button>
        <button className="hero-arrow hero-arrow-next" type="button" onClick={next} aria-label="Próximo banner">›</button>
        <button className="hero-playback" type="button" onClick={()=>setPaused((value)=>!value)} aria-label={paused ? 'Reproduzir banners' : 'Pausar banners'} aria-pressed={paused}>
          {paused ? <span className="play-icon"/> : <span className="pause-icon"><i/><i/></span>}
        </button>
      </>}
      <div className="hero-dots">{available.map((item,index)=><button key={String(item.id)} onClick={()=>{ setHeroTransition(true); setSlidePosition(index+1); }} className={active===index?'active':''} aria-label={`Banner ${index+1}`}/>)}</div>
    </section>
  </>;
}
