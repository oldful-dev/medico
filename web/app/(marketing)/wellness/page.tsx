"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import waitlistService from "@/services/api/waitlistService";
import { useCartStore } from "@/store/cartStore";
import {
  Loader2,
  ShoppingCart,
  Package,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import WellnessProductDetail from "./WellnessProductDetail";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.ayuxacare.com/api";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  mrp: number;
  stock: number;
  isEnabled: boolean;
  imageUrl: string | null;
  category: { name: string } | null;
}

export default function WellnessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-[#FFFCF6] flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
        </div>
      }
    >
      <WellnessRouter />
    </Suspense>
  );
}

function WellnessRouter() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("id");

  if (productId) {
    return <WellnessProductDetail id={productId} />;
  }

  return <WellnessListing />;
}

function WellnessListing() {
  const router = useRouter();
  const { addItem } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [page, setPage] = useState(1);
  const itemsPerPage = 9;

  // Waitlist state (shown when no products)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/products?isEnabled=true&limit=50`)
      .then((r) => r.json())
      .then((json) => {
        const items: Product[] = json.data || [];
        setProducts(items.filter((p) => p.isEnabled && p.stock > 0));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));

    // Auto-detect city for waitlist
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((d) => {
        if (d.city) setCity(d.city);
      })
      .catch(() => {});
  }, []);

  const handleJoinWaitlist = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsSubmitting(true);
    try {
      await waitlistService.join({
        name,
        email,
        city,
        source: "wellness_page",
      });
      toast.success("Joined waitlist! Check your mail.");
      setName("");
      setEmail("");
    } catch (error: unknown) {
      const e = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        e.response?.data?.message || e.message || "Failed to join waitlist.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    addItem({
      type: "product",
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl ?? undefined,
    });
    toast.success(`${product.name} added to cart!`);
    router.push("/app/cart");
  };

  // ── LOADING ──────────────────────────────────────
  if (loadingProducts) {
    return (
      <div className="flex-1 bg-[#FFFCF6] flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  // ── STORE VIEW (products exist) ───────────────────
  if (products.length > 0) {
    const totalPages = Math.ceil(products.length / itemsPerPage);
    const paginatedProducts = products.slice(
      (page - 1) * itemsPerPage,
      page * itemsPerPage,
    );

    return (
      <div className="flex-1 bg-[#FFFCF6] font-[var(--font-poppins)] py-12 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[rgba(4,131,87,0.1)] text-[var(--color-primary)] text-xs font-bold uppercase tracking-wider mb-4">
              Wellness Store
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-3">
              Elevate your daily{" "}
              <span className="text-[var(--color-primary)]">wellness.</span>
            </h1>
            <p className="text-gray-500 text-lg max-w-xl">
              Curated health products for elderly care and rehabilitation.
            </p>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedProducts.map((product) => {
              const discount =
                product.mrp > product.price
                  ? Math.round(
                      ((product.mrp - product.price) / product.mrp) * 100,
                    )
                  : 0;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group flex flex-col"
                >
                  {/* Image — clicking navigates to detail */}
                  <Link href={`/wellness?id=${product.id}`} className="block">
                    <div className="aspect-square bg-gray-50 relative overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-200" />
                        </div>
                      )}
                      {discount > 0 && (
                        <span className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {discount}% OFF
                        </span>
                      )}
                      {product.stock <= 5 && product.stock > 0 && (
                        <span className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          Only {product.stock} left
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    {product.category && (
                      <span className="text-xs text-[var(--color-primary)] font-semibold uppercase tracking-wider">
                        {product.category.name}
                      </span>
                    )}
                    <Link
                      href={`/wellness?id=${product.id}`}
                      className="block group/title"
                    >
                      <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 group-hover/title:text-[var(--color-primary)] transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    {product.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    )}

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-lg font-black text-gray-900">
                        ₹{product.price.toLocaleString("en-IN")}
                      </span>
                      {product.mrp > product.price && (
                        <span className="text-sm text-gray-400 line-through">
                          ₹{product.mrp.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>

                    {/* CTAs */}
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="flex-1 bg-[var(--color-primary)] text-white font-semibold py-2.5 px-3 rounded-xl hover:bg-[var(--color-primary-dark)] transition-colors text-sm flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="w-4 h-4" /> Add
                      </button>
                      <Link
                        href={`/wellness?id=${product.id}`}
                        className="flex items-center justify-center gap-1 border border-gray-200 hover:border-[var(--color-primary)] text-gray-500 hover:text-[var(--color-primary)] font-semibold py-2.5 px-3 rounded-xl transition-colors text-sm"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              <button
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={page === 1}
                className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPage(i + 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors ${page === i + 1 ? "bg-[var(--color-primary)] text-white shadow-md" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={page === totalPages}
                className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── COMING SOON (no products) ─────────────────────
  return (
    <div className="flex-1 bg-[#FFFCF6] font-[var(--font-poppins)] flex items-center justify-center py-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-10 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full bg-gradient-radial from-[#34C759]/20 to-transparent blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] rounded-full bg-gradient-radial from-orange-400/10 to-transparent blur-3xl opacity-60 pointer-events-none"></div>

      <main className="container mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center gap-10 max-w-6xl">
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left mt-8 md:mt-0">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[rgba(4,131,87,0.1)] text-[var(--color-primary)] text-xs font-bold uppercase tracking-wider mb-6">
            Coming Soon
          </span>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-[1.1] mb-6 tracking-tight">
            Elevate your <br className="hidden md:block" /> daily{" "}
            <span className="text-[var(--color-primary)]">wellness.</span>
          </h1>
          <p className="text-gray-500 text-lg md:text-xl font-medium max-w-md mb-10">
            Personalized diet plans, fitness tracking, and mindfulness exercises
            tailored specifically for elderly & rehabilitation care.
          </p>

          <div className="w-full max-w-md flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-5 py-4 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all font-medium text-gray-800 shadow-sm"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-5 py-4 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all font-medium text-gray-800 shadow-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="City (Optional)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="flex-1 px-5 py-4 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all font-medium text-gray-800 shadow-sm bg-white/50"
              />
              <button
                onClick={handleJoinWaitlist}
                disabled={isSubmitting}
                className="bg-[var(--color-primary)] text-white font-bold py-4 px-8 rounded-xl hover:bg-[var(--color-primary-dark)] transition-colors shadow-lg hover:shadow-xl shrink-0 whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-2 min-w-[160px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Joining...
                  </>
                ) : (
                  "Join Waitlist"
                )}
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Be the first to access our new features.
            </p>
          </div>
        </div>

        <div className="flex-1 w-full flex justify-center scale-90 md:scale-100">
          <div className="relative w-full max-w-[400px] aspect-square">
            <div className="absolute top-10 right-0 w-[240px] bg-white/70 backdrop-blur-md border border-white p-5 rounded-2xl shadow-xl flex gap-4 opacity-80 rotate-3 z-10 filter grayscale-[40%]">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-xl">
                🥗
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <div className="w-20 h-4 bg-gray-200 rounded"></div>
                <div className="w-32 h-3 bg-gray-100 rounded"></div>
              </div>
            </div>
            <div className="absolute top-[45%] left-0 w-[260px] bg-white/70 backdrop-blur-md border border-white p-5 rounded-3xl shadow-2xl flex gap-4 opacity-70 -rotate-6 z-20 filter grayscale-[40%]">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-xl">
                🧘‍♀️
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <div className="w-24 h-4 bg-gray-200 rounded"></div>
                <div className="w-full h-8 flex gap-1 items-end mt-1">
                  <div className="w-6 h-full bg-gray-200 rounded-sm"></div>
                  <div className="w-6 h-[60%] bg-gray-200 rounded-sm"></div>
                  <div className="w-6 h-[80%] bg-gray-200 rounded-sm"></div>
                </div>
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/80 backdrop-blur text-white p-4 rounded-full z-30 shadow-2xl">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
