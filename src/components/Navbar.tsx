import { useState } from 'react';
import { User } from 'firebase/auth';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react';
import { isAdminUser } from '../types/ecommerce';

interface NavbarProps {
  user: User | null;
  cartCount: number;
  brandName?: string;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  onOpenAdmin: () => void;
  onSignInGoogle: () => void;
  authLoading: boolean;
}

export function Navbar({
  user,
  cartCount,
  brandName = 'MAISON SMASH',
  onOpenCart,
  onOpenOrders,
  onOpenAdmin,
  onSignInGoogle,
  authLoading,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const firstName = user?.displayName?.split(' ')[0] || 'Mon Compte';
  const admin = isAdminUser(user);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 32,
    restDelta: 0.001,
  });

  const closeMobileAndRun = (fn: () => void) => {
    setMobileMenuOpen(false);
    fn();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200 text-[#141414]">
      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Single-element wordmark + mobile menu trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 -ml-2 rounded-lg text-[#141414] hover:bg-[#F5F5F7] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <a
            href="#top"
            className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-[#141414] whitespace-nowrap shrink-0"
          >
            {brandName}
          </a>
        </div>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Navigation principale"
          className="hidden md:flex items-center gap-5 lg:gap-7 text-sm font-medium text-zinc-600"
        >
          <a
            href="#burger-story"
            className="ms-link-underline hover:text-[#141414] transition-colors whitespace-nowrap shrink-0"
          >
            L’Atelier
          </a>
          <a
            href="#pizzas"
            className="hidden lg:inline-block ms-link-underline hover:text-[#141414] transition-colors whitespace-nowrap shrink-0"
          >
            Pizzas
          </a>
          <a
            href="#crispy-drinks"
            className="hidden xl:inline-block ms-link-underline hover:text-[#141414] transition-colors whitespace-nowrap shrink-0"
          >
            Poulet &amp; Shakes
          </a>
          <a
            href="#menu"
            className="ms-link-underline hover:text-[#141414] transition-colors whitespace-nowrap shrink-0"
          >
            La Carte
          </a>
          <button
            type="button"
            onClick={onOpenOrders}
            className="ms-link-underline hover:text-[#141414] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Mes Commandes
          </button>
          {admin ? (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="ms-link-underline text-[#D92323] font-semibold hover:text-[#B81C1C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Administration
            </button>
          ) : user ? (
            <button
              type="button"
              onClick={onOpenOrders}
              className="ms-link-underline hover:text-[#141414] transition-colors whitespace-nowrap shrink-0 truncate max-w-[140px] cursor-pointer"
            >
              {firstName}
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignInGoogle}
              disabled={authLoading}
              className="ms-link-underline hover:text-[#141414] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {authLoading ? 'Connexion...' : 'Connexion Google'}
            </button>
          )}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <motion.button
            type="button"
            onClick={onOpenCart}
            whileTap={{ scale: 0.96 }}
            className="ms-btn-glint inline-flex items-center gap-2 px-3.5 sm:px-4 min-h-[44px] bg-[#D92323] text-white text-sm font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D92323]"
          >
            <ShoppingBag className="w-4 h-4" strokeWidth={2} />
            <span>Panier</span>
            <motion.span
              key={cartCount}
              initial={{ scale: 1.25 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.18 }}
              className="font-mono tabular-nums text-xs opacity-95"
            >
              · {cartCount}
            </motion.span>
          </motion.button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            aria-label="Navigation mobile"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden border-t border-zinc-200 bg-white text-[#141414] px-4 py-3 space-y-1 shadow-lg max-h-[calc(100svh-4rem)] overflow-y-auto"
          >
            <a
              href="#burger-story"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center min-h-[44px] px-3 rounded-lg text-sm font-semibold text-[#141414] hover:bg-[#F5F5F7] transition-colors"
            >
              L’Atelier Burger
            </a>
            <a
              href="#pizzas"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center min-h-[44px] px-3 rounded-lg text-sm font-semibold text-[#141414] hover:bg-[#F5F5F7] transition-colors"
            >
              Pizzas sur Pierre
            </a>
            <a
              href="#crispy-drinks"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center min-h-[44px] px-3 rounded-lg text-sm font-semibold text-[#141414] hover:bg-[#F5F5F7] transition-colors"
            >
              Poulet Crispy &amp; Milkshakes
            </a>
            <a
              href="#menu"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center min-h-[44px] px-3 rounded-lg text-sm font-semibold text-[#141414] hover:bg-[#F5F5F7] transition-colors"
            >
              La Carte Complète
            </a>
            <button
              type="button"
              onClick={() => closeMobileAndRun(onOpenOrders)}
              className="w-full flex items-center justify-between min-h-[44px] px-3 rounded-lg text-sm font-semibold text-[#141414] hover:bg-[#F5F5F7] transition-colors text-left cursor-pointer"
            >
              <span>Mes Commandes</span>
              {user && (
                <span className="text-xs font-normal text-zinc-500 truncate max-w-[140px]">
                  {firstName}
                </span>
              )}
            </button>

            {admin && (
              <button
                type="button"
                onClick={() => closeMobileAndRun(onOpenAdmin)}
                className="w-full flex items-center min-h-[44px] px-3 rounded-lg text-sm font-semibold text-[#D92323] hover:bg-red-50 transition-colors text-left cursor-pointer"
              >
                Administration
              </button>
            )}

            {!user && (
              <button
                type="button"
                onClick={() => closeMobileAndRun(onSignInGoogle)}
                disabled={authLoading}
                className="w-full flex items-center min-h-[44px] px-3 rounded-lg text-sm font-semibold text-[#141414] bg-[#F5F5F7] hover:bg-zinc-200/70 transition-colors text-left cursor-pointer disabled:opacity-50"
              >
                {authLoading ? 'Connexion...' : 'Connexion Google'}
              </button>
            )}
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Scroll Progress Hairline */}
      <motion.div
        style={{ scaleX }}
        className="h-[2px] bg-[#D92323] origin-left"
        aria-hidden="true"
      />
    </header>
  );
}
