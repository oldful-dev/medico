'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';
import {
  ArrowLeft, ShoppingCart, Package, Tag, CheckCircle,
  AlertTriangle, Star, Truck, ShieldCheck, RefreshCw,
  Loader2, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://Ayuxa.onrender.com/api';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  mrp: number;
  stock: number;
  isEnabled: boolean;
  imageUrl: string | null;
  category: { id: string; name: string; slug: string } | null;
  createdAt: string;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addItem } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<Product[]>([]);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/products/${id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setProduct(json.data);
          // Fetch related products from same category
          if (json.data.category?.id) {
            const relRes = await fetch(`${API_URL}/products?isEnabled=true&categoryId=${json.data.category.id}&limit=5`);
            const rel = await relRes.json();
            const items: Product[] = rel.data || [];
            setRelated(items.filter(p => p.id !== id && p.stock > 0).slice(0, 4));
          }
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      type: 'product',
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl ?? undefined,
    });
    toast.success(`${product.name} added to cart!`);
    router.push('/app/cart');
  };

  if (loading) {
    return (
      <div className="flex-1 bg-[#FFFCF6] flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex-1 bg-[#FFFCF6] flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Package className="w-16 h-16 text-gray-200" />
        <p className="text-gray-500 font-semibold">Product not found.</p>
        <Link href="/wellness" className="text-[var(--color-primary)] font-bold text-sm underline underline-offset-4">
          Back to Wellness Store
        </Link>
      </div>
    );
  }

  const discount = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  const savings = product.mrp > product.price
    ? (product.mrp - product.price).toLocaleString('en-IN')
    : null;

  const stockStatus =
    product.stock === 0 ? 'out' :
    product.stock <= 5 ? 'low' : 'ok';

  return (
    <div className="flex-1 bg-[#FFFCF6] font-[var(--font-poppins)]">
      <div className="max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6 font-medium">
          <Link href="/wellness" className="hover:text-[var(--color-primary)] transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Wellness Store
          </Link>
          <ChevronRight className="w-3 h-3" />
          {product.category && (
            <>
              <span className="hover:text-[var(--color-primary)] transition-colors cursor-pointer">
                {product.category.name}
              </span>
              <ChevronRight className="w-3 h-3" />
            </>
          )}
          <span className="text-gray-600 truncate max-w-[200px]">{product.name}</span>
        </nav>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14 mb-16">

          {/* Left — Image */}
          <div className="relative">
            <div className="aspect-square bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex items-center justify-center">
              {product.imageUrl && !imageError ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-200">
                  <Package className="w-20 h-20" />
                  <span className="text-sm font-medium text-gray-300">No image</span>
                </div>
              )}
            </div>

            {/* Badges on image */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {discount > 0 && (
                <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  {discount}% OFF
                </span>
              )}
              {stockStatus === 'low' && (
                <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  Only {product.stock} left
                </span>
              )}
              {stockStatus === 'out' && (
                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  Out of Stock
                </span>
              )}
            </div>
          </div>

          {/* Right — Details */}
          <div className="flex flex-col gap-5">
            {product.category && (
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
                {product.category.name}
              </span>
            )}

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
              {product.name}
            </h1>

            {/* Ratings placeholder */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs text-gray-400 font-medium">Verified Quality</span>
            </div>

            {/* Price block */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-black text-gray-900">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                {product.mrp > product.price && (
                  <span className="text-lg text-gray-400 line-through font-medium">
                    ₹{product.mrp.toLocaleString('en-IN')}
                  </span>
                )}
                {discount > 0 && (
                  <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                    {discount}% off
                  </span>
                )}
              </div>
              {savings && (
                <p className="text-sm text-emerald-700 font-semibold">
                  You save ₹{savings} on this order
                </p>
              )}
              <p className="text-xs text-gray-400">Inclusive of all taxes</p>
            </div>

            {/* Stock status */}
            <div className="flex items-center gap-2">
              {stockStatus === 'ok' && (
                <><CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700">In Stock</span></>
              )}
              {stockStatus === 'low' && (
                <><AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-700">Only {product.stock} units left</span></>
              )}
              {stockStatus === 'out' && (
                <><AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-red-700">Out of Stock</span></>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={handleAddToCart}
              disabled={stockStatus === 'out'}
              className="flex items-center justify-center gap-2 w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl transition-colors text-base shadow-lg shadow-emerald-900/10 active:scale-[0.98]"
            >
              <ShoppingCart className="w-5 h-5" />
              {stockStatus === 'out' ? 'Out of Stock' : 'Add to Cart'}
            </button>

            {/* Trust signals */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: Truck, label: 'Fast Delivery' },
                { icon: ShieldCheck, label: 'Genuine Products' },
                { icon: RefreshCw, label: 'Easy Returns' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 bg-white border border-gray-100 rounded-xl p-3 text-center">
                  <Icon className="w-4 h-4 text-[var(--color-primary)]" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100">About this Product</h2>
            <p className="text-gray-600 leading-relaxed text-base whitespace-pre-line">{product.description}</p>
          </div>
        )}

        {/* Related Products */}
        {related.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">More in {product.category?.name}</h2>
              <Link href="/wellness" className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {related.map(rel => {
                const relDiscount = rel.mrp > rel.price
                  ? Math.round(((rel.mrp - rel.price) / rel.mrp) * 100) : 0;
                return (
                  <Link
                    key={rel.id}
                    href={`/wellness/${rel.id}`}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group block"
                  >
                    <div className="aspect-square bg-gray-50 relative overflow-hidden">
                      {rel.imageUrl ? (
                        <img src={rel.imageUrl} alt={rel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-200" />
                        </div>
                      )}
                      {relDiscount > 0 && (
                        <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {relDiscount}% OFF
                        </span>
                      )}
                    </div>
                    <div className="p-3 flex flex-col gap-1">
                      <h3 className="font-bold text-gray-900 text-xs leading-snug line-clamp-2">{rel.name}</h3>
                      <span className="text-sm font-black text-gray-900">₹{rel.price.toLocaleString('en-IN')}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
