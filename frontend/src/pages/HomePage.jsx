import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import ProductCard from '../components/ProductCard.jsx';
import { StoreLayout } from '../components/StoreLayout.jsx';

const categoriesDefault = [
  ['Sneakers', 'sneakers', 'photo-1600185365483-26d7a4cc7519'], ['Running', 'running', 'photo-1552674605-db6ffd4facb5'],
  ['Formal', 'formal', 'photo-1600185365483-26d7a4cc7519'], ['Loafers', 'loafers', 'photo-1531310197839-ccf54634509e'],
  ['Boots', 'boots', 'photo-1608256246200-53e635b5b65f'], ['Sandals', 'sandals', 'photo-1603487742131-4160ec999306']
];
const editorialSlides = [
  { image: 'photo-1600185365483-26d7a4cc7519', eyebrow: 'THE LIGHTER SIDE OF EVERYDAY', first: 'Find your', second: 'fresh start.', text: 'Easy comfort, clean lines, and a little more room for wherever today takes you.', caption: 'The everyday essential' },
  { image: 'photo-1622143462763-c31bf56371e5', eyebrow: 'MADE FOR CITY MILES', first: 'Meet the', second: 'city walker.', text: 'From the morning commute to one last detour, move through the day your way.', caption: 'City to side street' },
  { image: 'photo-1490114538077-0a7f8cb49891', eyebrow: 'A LITTLE MORE POLISHED', first: 'Step into', second: 'something lasting.', text: 'Refined shapes and thoughtful details bring a sharper finish to everyday plans.', caption: 'A considered classic' },
  { image: 'photo-1612705071290-eeb0f44bc58d', eyebrow: 'WEEKENDS, AT YOUR PACE', first: 'Take the', second: 'long way home.', text: 'Comfortable, dependable pairs for slow starts, open plans, and everything between.', caption: 'Leave room to wander' },
  { image: 'photo-1535050040180-e159cb2637f5', eyebrow: 'A BRIGHTER KIND OF STEP', first: 'Make room for', second: 'sunlit days.', text: 'Light, expressive styles add a little color to the places you already love.', caption: 'A change of pace' }
];

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [exclusive, setExclusive] = useState([]);
  const [categories, setCategories] = useState([]);
  const [slide, setSlide] = useState(null);
  const [editorialIndex, setEditorialIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [heroPaused, setHeroPaused] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get('/products?limit=4&sort=popular'), api.get('/products/exclusive?limit=4'),
      api.get('/categories'), api.get('/hero-slides')
    ]).then(([productResult, exclusiveResult, categoryResult, slideResult]) => {
      if (!active) return;
      if (productResult.status === 'fulfilled') setProducts(productResult.value.data.data);
      if (exclusiveResult.status === 'fulfilled') setExclusive(exclusiveResult.value.data.data);
      if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value.data.data);
      if (slideResult.status === 'fulfilled') setSlide(slideResult.value.data.data[0] || null);
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (slide || heroPaused) return undefined;
    const timer = window.setInterval(() => setEditorialIndex((current) => {
      const choices = editorialSlides.map((_, index) => index).filter((index) => index !== current);
      return choices[Math.floor(Math.random() * choices.length)];
    }), 2000);
    return () => window.clearInterval(timer);
  }, [slide, heroPaused]);
  const shownCategories = categories.length ? categories : categoriesDefault.map(([name, slug, imageId], index) => ({ name, slug, image: `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=700&q=80`, sortOrder: index }));
  const editorial = editorialSlides[editorialIndex];
  const heroImage = slide?.image || `https://images.unsplash.com/${editorial.image}?auto=format&fit=crop&w=1800&q=88`;

  return (
    <StoreLayout>
      <main>
        <section className="store-hero" onMouseEnter={() => setHeroPaused(true)} onMouseLeave={() => setHeroPaused(false)} onFocus={() => setHeroPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHeroPaused(false); }}>
          <HeroImage src={heroImage} />
          <div className="hero-copy-panel">
            <Link className="hero-wordmark" to="/">tread<span>&amp;</span>co</Link>
            <div className="hero-content" key={slide ? 'customer-story' : editorial.caption}>
              <p className="eyebrow">{slide ? 'A CUSTOMER STORY' : editorial.eyebrow}</p>
              <h1>{slide ? <>Steps with<br /><em>tread&amp;co.</em></> : <>{editorial.first}<br /><em>{editorial.second}</em></>}</h1>
              <p>{slide?.quote || editorial.text}</p>
              <Link className="shop-button" to="/products">Explore the collection <span aria-hidden="true">&#8599;</span></Link>
            </div>
            {!slide && <div className="hero-pagination" role="group" aria-label="Featured collections">
              <button className="hero-arrow" type="button" aria-label="Previous slide" onClick={() => setEditorialIndex((index) => (index - 1 + editorialSlides.length) % editorialSlides.length)}>&larr;</button>
              {editorialSlides.map((item, index) => <button className="hero-dot" type="button" key={item.caption} aria-label={`Show slide ${index + 1}`} aria-current={index === editorialIndex ? 'true' : undefined} onClick={() => setEditorialIndex(index)} />)}
              <button className="hero-arrow" type="button" aria-label="Next slide" onClick={() => setEditorialIndex((index) => (index + 1) % editorialSlides.length)}>&rarr;</button>
            </div>}
          </div>
          <div className="hero-caption">{slide ? <><span>{slide.name}, {slide.city}</span><span>{slide.productRef?.title || 'Customer story'}</span></> : <><span>{editorial.caption}</span><span>tread&amp;co &middot; The everyday edit</span></>}</div>
        </section>

        <section className="store-section category-section" id="collections">
          <div className="section-heading"><div><p className="eyebrow">START WITH YOUR ROUTINE</p><h2>Find your kind of fit.</h2></div><Link to="/products">Shop all footwear ↗</Link></div>
          <div className="category-grid">{shownCategories.slice(0, 6).map((category) => <Link className="category-tile" to={`/products?category=${encodeURIComponent(category.slug)}`} key={category.slug}>
            <img src={category.image || 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=700&q=80'} alt="" loading="lazy" />
            <span>{category.name}<b>↗</b></span>
          </Link>)}</div>
        </section>

        <section className="store-section exclusive-section">
          <div className="section-heading"><div><p className="eyebrow">A LITTLE MORE DISTINCTIVE</p><h2>Only at tread&amp;co.</h2><p>Thoughtful details. Familiar comfort. A point of view all their own.</p></div><Link to="/products?exclusive=true">Discover the edit ↗</Link></div>
          {exclusive.length ? <div className="product-grid">{exclusive.map((product) => <ProductCard key={product._id || product.slug} product={product} />)}</div> : <CatalogEmpty loaded={loaded} />}
        </section>

        <section className="story-band" id="story">
          <div className="story-band-image" role="img" aria-label="Running shoes ready for everyday movement" />
          <div className="story-band-copy"><p className="eyebrow">A BETTER KIND OF EVERYDAY</p><h2>Made to move.<br /><em>Made to last.</em></h2><p>We believe the best shoes are the ones you reach for without thinking. So we focus on considered materials, dependable comfort, and details that earn their place.</p><Link to="/products" className="story-link">Get to know the collection <span>↗</span></Link></div>
        </section>

        <section className="store-section popular-section">
          <div className="section-heading"><div><p className="eyebrow">THE PAIRS YOU COME BACK TO</p><h2>Well-loved, well-made.</h2></div><Link to="/products?sort=popular">Shop bestsellers ↗</Link></div>
          {products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product._id || product.slug} product={product} />)}</div> : <CatalogEmpty loaded={loaded} />}
        </section>

        <section className="promise-strip"><div><b>01</b><span>Comfort, considered</span></div><div><b>02</b><span>Free delivery over ₹2,999</span></div><div><b>03</b><span>Easy 7-day returns</span></div><div><b>04</b><span>Secure checkout</span></div></section>
      </main>
    </StoreLayout>
  );
}

function HeroImage({ src }) {
  const [current, setCurrent] = useState(src);
  const [next, setNext] = useState(null);
  const [nextVisible, setNextVisible] = useState(false);

  useEffect(() => {
    if (!src || src === current) return undefined;
    let cancelled = false;
    let started = false;
    let frame;
    let timer;
    const image = new window.Image();
    const beginCrossfade = () => {
      if (cancelled || started) return;
      started = true;
      setNext(src);
      frame = window.requestAnimationFrame(() => setNextVisible(true));
      timer = window.setTimeout(() => {
        setCurrent(src);
        setNext(null);
        setNextVisible(false);
      }, 2000);
    };
    image.onload = beginCrossfade;
    image.onerror = beginCrossfade;
    image.src = src;
    if (image.complete && image.naturalWidth > 0) beginCrossfade();
    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
    };
  }, [src, current]);

  return <div className="hero-photo" aria-hidden="true">
    <div className="hero-photo-image" style={{ backgroundImage: `url("${current}")` }} />
    {next && <div className={`hero-photo-image hero-photo-next${nextVisible ? ' is-visible' : ''}`} style={{ backgroundImage: `url("${next}")` }} />}
  </div>;
}

function CatalogEmpty({ loaded }) {
  return <div className="catalog-empty">{loaded ? <>This edit is being refreshed. <strong>Explore the full footwear collection to find your next favorite pair.</strong><Link to="/products">Browse all footwear <span aria-hidden="true">↗</span></Link></> : 'Finding your next favorite pair…'}</div>;
}
