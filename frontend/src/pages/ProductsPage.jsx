import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { StoreLayout } from '../components/StoreLayout.jsx';
import { api } from '../services/api.js';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const queryString = searchParams.toString();
  const filters = useMemo(() => Object.fromEntries(new URLSearchParams(queryString)), [queryString]);

  useEffect(() => {
    let active = true;
    api.get('/categories').then(({ data }) => { if (active) setCategories(data.data); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api.get(`/products${queryString ? `?${queryString}` : ''}`).then(({ data }) => {
      if (active) { setProducts(data.data); setMeta(data.meta); }
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'We could not load the collection. Please try again.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [queryString]);

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  }

  return (
    <StoreLayout>
      <main className="collection-page">
        <section className="collection-intro"><p className="eyebrow">THE tread&amp;co COLLECTION</p><h1>{filters.q ? `Results for “${filters.q}”` : filters.category ? `${filters.category[0].toUpperCase()}${filters.category.slice(1)}` : filters.exclusive === 'true' ? 'The exclusive edit' : 'Find your next pair.'}</h1><p>Considered footwear for the everyday and everything in between.</p></section>
        <div className="catalog-controls">
          <div className="catalog-result-count">{loading ? 'Finding your fit…' : `${meta.total} ${meta.total === 1 ? 'pair' : 'pairs'}`}</div>
          <div className="filter-controls">
            <label>Category<select value={filters.category || ''} onChange={(e) => setFilter('category', e.target.value)}><option value="">All styles</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
            <label>Size<select value={filters.size || ''} onChange={(e) => setFilter('size', e.target.value)}><option value="">All sizes</option>{[6, 7, 8, 9, 10, 11].map((size) => <option key={size}>{size}</option>)}</select></label>
            <label>Sort by<select value={filters.sort || 'newest'} onChange={(e) => setFilter('sort', e.target.value)}><option value="newest">Latest</option><option value="popular">Popular</option><option value="rating">Top rated</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label>
          </div>
        </div>
        {(filters.q || filters.category || filters.size || filters.exclusive === 'true') && <div className="active-filters" aria-label="Active filters">{filters.q && <button className="active-filter-chip" onClick={() => setFilter('q', '')}>Search: “{filters.q}” <span aria-hidden="true">×</span></button>}{filters.category && <button className="active-filter-chip" onClick={() => setFilter('category', '')}>{filters.category} <span aria-hidden="true">×</span></button>}{filters.size && <button className="active-filter-chip" onClick={() => setFilter('size', '')}>UK {filters.size} <span aria-hidden="true">×</span></button>}{filters.exclusive === 'true' && <button className="active-filter-chip" onClick={() => setFilter('exclusive', '')}>Exclusive <span aria-hidden="true">×</span></button>}<button className="clear-filters" onClick={() => setSearchParams({})}>Clear all</button></div>}
        {error ? <div className="catalog-message" role="alert">{error}</div> : loading ? <div className="catalog-message">Loading the collection…</div> : products.length ? <div className="product-grid collection-grid">{products.map((product) => <ProductCard key={product._id || product.slug} product={product} />)}</div> : <div className="catalog-message"><h2>No pairs found for these filters.</h2><p>Try another size or clear a filter to see the full collection.</p><Link className="text-link" to="/products">See all footwear ↗</Link></div>}
        {!loading && meta.pages > 1 && <nav className="pagination" aria-label="Collection pages"><button disabled={meta.page <= 1} onClick={() => setFilter('page', String(meta.page - 1))}>← Previous</button><span>Page {meta.page} of {meta.pages}</span><button disabled={meta.page >= meta.pages} onClick={() => setFilter('page', String(meta.page + 1))}>Next →</button></nav>}
      </main>
    </StoreLayout>
  );
}
