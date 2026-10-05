import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DISHES, fetchDishes, BACKEND_MENU, type Dish } from "@/lib/menu";
import { addToCart, useWishlist } from "@/lib/cart";

const ALL = "all";

function categoryOf(dish: Dish) {
  return dish.categoryName || dish.tag || "Signature";
}

type MenuItemProps = {
  dish: Dish;
  index: number;
  liked: boolean;
  reduce: boolean;
  onToggleWish: (dish: Dish) => void;
  onAdd: (dish: Dish) => void;
};

const CompactMenuItem = memo(function CompactMenuItem({
  dish,
  index,
  liked,
  reduce,
  onToggleWish,
  onAdd,
}: MenuItemProps) {
  return (
    <motion.article
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.42, delay: Math.min(index, 6) * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="group relative grid min-w-0 grid-cols-[6.75rem_minmax(0,1fr)] items-center gap-3 rounded-2xl bg-background p-3 shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)] sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-5 sm:p-4"
    >
      <Link
        to="/dish/$slug"
        params={{ slug: dish.slug }}
        aria-label={`${dish.name} — full details`}
        className="relative aspect-square overflow-hidden rounded-xl bg-cream-deep"
      >
        <span className="absolute inset-y-3 left-0 w-[38%] rounded-r-full bg-flame" aria-hidden="true" />
        <img
          src={dish.image}
          alt={dish.name}
          loading="lazy"
          width={360}
          height={360}
          decoding="async"
          className="relative z-10 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </Link>

      <div className="min-w-0 py-0.5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <div className="min-w-0">
            <p className="truncate font-body text-[10px] font-extrabold tracking-[0.14em] text-flame uppercase">
              {dish.tag}
            </p>
            <Link to="/dish/$slug" params={{ slug: dish.slug }}>
              <h3 className="mt-0.5 line-clamp-2 font-display text-[1.05rem] leading-[1.05] font-extrabold text-charcoal transition-colors group-hover:text-flame sm:text-xl">
                {dish.name}
              </h3>
            </Link>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={liked ? `Remove ${dish.name} from wishlist` : `Add ${dish.name} to wishlist`}
            aria-pressed={liked}
            onClick={() => onToggleWish(dish)}
            className={`h-8 w-8 shrink-0 rounded-full ${liked ? "bg-flame text-cream hover:bg-flame-dark hover:text-cream" : "text-charcoal/45 hover:bg-flame/10 hover:text-flame"}`}
          >
            <Heart fill={liked ? "currentColor" : "none"} aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-1.5 flex items-center gap-0.5 text-gold" aria-label="Rated 4.9 out of 5">
          {[0, 1, 2, 3, 4].map((star) => (
            <Star key={star} className="h-3 w-3 fill-current" aria-hidden="true" />
          ))}
        </div>

        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <div className="min-w-0">
            <span className="block font-display text-lg leading-none font-extrabold text-flame sm:text-2xl">
              Rs {dish.price}
            </span>
            {dish.oldPrice && (
              <span className="mt-1 block text-[10px] leading-none text-charcoal/45 line-through">
                Rs {dish.oldPrice}
              </span>
            )}
          </div>
          <Button
            type="button"
            size="icon"
            aria-label={`Add ${dish.name} to cart`}
            onClick={() => onAdd(dish)}
            className="h-9 w-9 shrink-0 rounded-lg bg-gold text-charcoal shadow-[var(--shadow-pill)] hover:bg-ember"
          >
            <ShoppingBag aria-hidden="true" />
          </Button>
        </div>
      </div>
    </motion.article>
  );
});

function MenuSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-5" aria-hidden="true">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="grid grid-cols-[6.75rem_minmax(0,1fr)] gap-3 rounded-2xl bg-background p-3 shadow-[var(--shadow-card)] sm:grid-cols-[8.5rem_minmax(0,1fr)]">
          <div className="menu-skeleton__block aspect-square rounded-xl" />
          <div className="py-2">
            <div className="menu-skeleton__block h-3 w-1/3" />
            <div className="menu-skeleton__block mt-2 h-5 w-4/5" />
            <div className="menu-skeleton__block mt-4 h-3 w-1/2" />
            <div className="menu-skeleton__block mt-3 h-6 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MenuShowcase() {
  const reduce = !!useReducedMotion();
  const wishlist = useWishlist();
  const [active, setActive] = useState(ALL);

  const { data: dishes = BACKEND_MENU ? [] : DISHES, isLoading } = useQuery({
    queryKey: ["menu-dishes"],
    queryFn: () => fetchDishes(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const handleCategorySelect = (event: Event) => {
      const category = (event as CustomEvent<string>).detail;
      if (category) setActive(category);
    };
    window.addEventListener("menu-category-select", handleCategorySelect);
    return () => window.removeEventListener("menu-category-select", handleCategorySelect);
  }, []);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    dishes.forEach((dish) => {
      const category = categoryOf(dish);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });
    return [...counts.entries()].map(([name, count]) => ({ name, count }));
  }, [dishes]);

  const visible = useMemo(
    () => (active === ALL ? dishes : dishes.filter((dish) => categoryOf(dish) === active)),
    [active, dishes],
  );

  const handleToggleWish = useCallback(
    (dish: Dish) => {
      const wasLiked = wishlist.has(dish.slug);
      wishlist.toggle(dish.slug);
      toast(wasLiked ? "Wishlist se hata diya" : "Wishlist mein save ho gaya", {
        description: dish.name,
      });
    },
    [wishlist],
  );

  const handleAdd = useCallback((dish: Dish) => {
    addToCart(dish.slug, "Regular", 1);
    toast.success(`${dish.name} cart mein add ho gaya`, {
      description: "Cart se ek hi jagah pura order place karein.",
    });
  }, []);

  return (
    <section id="menu" className="relative overflow-x-clip bg-cream py-12 sm:py-20">
      <div className="pointer-events-none absolute inset-0 menu-grain" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1180px] px-4 sm:px-8">
        <motion.header
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <span className="font-poster text-2xl text-ember uppercase sm:text-3xl">Fresh from the fire</span>
          <h2 className="mt-1 font-hero text-4xl leading-none text-charcoal uppercase sm:text-6xl">Our Menu</h2>
          <span className="mx-auto mt-3 block h-1.5 w-24 rounded-full bg-gold" aria-hidden="true" />
        </motion.header>

        <div className="sticky top-0 z-40 -mx-4 mt-6 border-y border-charcoal/10 bg-cream/95 px-4 py-2.5 backdrop-blur-md sm:static sm:mx-0 sm:mt-8 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
          <div className="scrollbar-none flex gap-2 overflow-x-auto sm:justify-center" role="tablist" aria-label="Menu categories">
            {[{ name: ALL, count: dishes.length }, ...categories].map((category) => {
              const selected = active === category.name;
              return (
                <Button
                  key={category.name}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  variant={selected ? "default" : "outline"}
                  onClick={() => setActive(category.name)}
                  className={`h-9 shrink-0 rounded-full px-4 font-display text-[11px] font-extrabold tracking-[0.1em] uppercase ${selected ? "bg-flame text-cream hover:bg-flame-dark" : "border-charcoal/15 bg-cream text-charcoal/70 hover:border-flame/40 hover:bg-flame/10 hover:text-flame"}`}
                >
                  {category.name === ALL ? "All" : category.name}
                  <span className={selected ? "text-cream/75" : "text-charcoal/40"}>{category.count}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 sm:mt-8">
          <p className="font-display text-xs font-extrabold tracking-[0.16em] text-charcoal/55 uppercase">
            {active === ALL ? "All dishes" : active}
          </p>
          <p className="shrink-0 font-body text-xs text-charcoal/55">{visible.length} items</p>
        </div>

        <div className="mt-3">
          {isLoading ? (
            <MenuSkeleton />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
              {visible.map((dish, index) => (
                <CompactMenuItem
                  key={dish.slug}
                  dish={dish}
                  index={index}
                  liked={wishlist.has(dish.slug)}
                  reduce={reduce}
                  onToggleWish={handleToggleWish}
                  onAdd={handleAdd}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}