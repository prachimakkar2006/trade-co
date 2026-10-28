import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const CommerceContext = createContext(null);
const CART_KEY = 'treadco:guest-cart:v1';
const WISHLIST_KEY = 'treadco:guest-wishlist:v1';
const FREE_SHIPPING_THRESHOLD = 2999;
const STANDARD_SHIPPING = 199;

function readStored(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function guestSummary(items) {
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
  return { items, coupon: null, pricing: { subtotal, discount: 0, shipping, total: subtotal + shipping } };
}

export function CommerceProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [guestItems, setGuestItems] = useState(() => readStored(CART_KEY));
  const [serverCart, setServerCart] = useState(null);
  const [guestWishlist, setGuestWishlist] = useState(() => readStored(WISHLIST_KEY));
  const [wishlist, setWishlist] = useState([]);
  const [commerceError, setCommerceError] = useState('');
  const [commerceLoading, setCommerceLoading] = useState(false);
  const syncedUsers = useRef(new Set());

  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(guestItems)); }, [guestItems]);
  useEffect(() => { localStorage.setItem(WISHLIST_KEY, JSON.stringify(guestWishlist)); }, [guestWishlist]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setServerCart(null);
      setWishlist([]);
      setCommerceLoading(false);
      syncedUsers.current.clear();
      return;
    }
    const userId = user.id;
    if (syncedUsers.current.has(userId)) return;
    syncedUsers.current.add(userId);
    setCommerceLoading(true);

    async function syncCommerce() {
      const guestCart = readStored(CART_KEY);
      if (guestCart.length) {
        try {
          await api.post('/cart/merge', { items: guestCart.map((item) => ({ productId: item.productId, size: item.size, quantity: item.quantity })) });
          localStorage.removeItem(CART_KEY);
          setGuestItems([]);
        } catch (error) {
          setCommerceError(error.response?.data?.message || 'Some saved items could not be added to your bag.');
        }
      }
      try {
        const { data } = await api.get('/cart');
        setServerCart(data.data);
      } catch (error) {
        syncedUsers.current.delete(userId);
        setCommerceError(error.response?.data?.message || 'We could not sync your bag. Please try again.');
      }

      try {
        const guestFavorites = readStored(WISHLIST_KEY);
        for (const item of guestFavorites) await api.post(`/wishlist/${encodeURIComponent(item._id)}`);
        if (guestFavorites.length) {
          localStorage.removeItem(WISHLIST_KEY);
          setGuestWishlist([]);
        }
        const { data } = await api.get('/wishlist');
        setWishlist(data.data);
      } catch (error) {
        setCommerceError(error.response?.data?.message || 'We could not sync your wishlist. Please try again.');
      }
      setCommerceLoading(false);
    }

    syncCommerce();
  }, [authLoading, user]);

  const refreshCart = useCallback(async () => {
    if (!user) return;
    const { data } = await api.get('/cart');
    setServerCart(data.data);
  }, [user]);

  const addToCart = useCallback(async (product, size, quantity = 1) => {
    setCommerceError('');
    if (user) {
      const { data } = await api.post('/cart/items', { productId: product._id, size, quantity });
      setServerCart(data.data);
      return;
    }
    const sku = `${product.slug}-uk-${size}`;
    const existing = guestItems.find((item) => item.sku === sku);
    const nextQuantity = (existing?.quantity || 0) + quantity;
    const stock = product.sizes?.find((entry) => entry.size === size)?.stock || 0;
    if (nextQuantity > Math.min(stock, 20)) {
      throw new Error('That size is not available in the requested quantity.');
    }
    const item = {
        sku, productId: product._id, size, quantity: nextQuantity,
        product: { _id: product._id, title: product.title, slug: product.slug, brand: product.brand, price: product.price, mrp: product.mrp, images: product.images, color: product.color, sizes: product.sizes }
    };
    setGuestItems((items) => existing ? items.map((entry) => entry.sku === sku ? item : entry) : [...items, item]);
  }, [guestItems, user]);

  const updateCartItem = useCallback(async (sku, quantity) => {
    setCommerceError('');
    if (user) {
      const { data } = await api.patch(`/cart/items/${encodeURIComponent(sku)}`, { quantity });
      setServerCart(data.data);
      return;
    }
    const item = guestItems.find((entry) => entry.sku === sku);
    const stock = item?.product.sizes?.find((entry) => entry.size === item.size)?.stock ?? 20;
    if (quantity > Math.min(stock, 20)) throw new Error('That quantity is no longer available.');
    setGuestItems((items) => items.map((entry) => entry.sku === sku ? { ...entry, quantity } : entry));
  }, [guestItems, user]);

  const removeCartItem = useCallback(async (sku) => {
    setCommerceError('');
    if (user) {
      const { data } = await api.delete(`/cart/items/${encodeURIComponent(sku)}`);
      setServerCart(data.data);
      return;
    }
    setGuestItems((items) => items.filter((item) => item.sku !== sku));
  }, [user]);

  const applyCoupon = useCallback(async (code) => {
    if (!user) {
      navigate('/login', { state: { from: '/cart' } });
      return;
    }
    const { data } = await api.post('/cart/coupon', { code });
    setServerCart(data.data);
  }, [navigate, user]);

  const removeCoupon = useCallback(async () => {
    if (!user) return;
    const { data } = await api.delete('/cart/coupon');
    setServerCart(data.data);
  }, [user]);

  const toggleWishlist = useCallback(async (product) => {
    setCommerceError('');
    if (user) {
      const exists = wishlist.some((item) => item._id === product._id);
      const { data } = exists
        ? await api.delete(`/wishlist/${encodeURIComponent(product._id)}`)
        : await api.post(`/wishlist/${encodeURIComponent(product._id)}`);
      setWishlist(data.data);
      return !exists;
    }
    let added = false;
    setGuestWishlist((items) => {
      const exists = items.some((item) => item._id === product._id);
      added = !exists;
      return exists ? items.filter((item) => item._id !== product._id) : [...items, product];
    });
    return added;
  }, [user, wishlist]);

  const isWishlisted = useCallback((productId) => (user ? wishlist : guestWishlist).some((item) => item._id === productId), [guestWishlist, user, wishlist]);
  const cart = user ? serverCart || guestSummary([]) : guestSummary(guestItems);
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = (user ? wishlist : guestWishlist).length;
  const value = useMemo(() => ({
    cart, cartCount, wishlist: user ? wishlist : guestWishlist, wishlistCount, commerceError, commerceLoading,
    addToCart, updateCartItem, removeCartItem, applyCoupon, removeCoupon, refreshCart, toggleWishlist, isWishlisted
  }), [cart, cartCount, user, wishlist, guestWishlist, wishlistCount, commerceError, commerceLoading, addToCart, updateCartItem, removeCartItem, applyCoupon, removeCoupon, refreshCart, toggleWishlist, isWishlisted]);
  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}

export function useCommerce() {
  const context = useContext(CommerceContext);
  if (!context) throw new Error('useCommerce must be used inside CommerceProvider');
  return context;
}
