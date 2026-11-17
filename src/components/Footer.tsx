export function Footer() {
  return (
    <footer className="bg-[#141414] text-zinc-300 border-t border-zinc-800">
      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-8 sm:pb-10 border-b border-zinc-800">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="font-display text-xl font-extrabold text-white tracking-tight mb-3">
              MAISON SMASH
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
              Smash burgers saisis à la minute, pizzas sur pierre, poulet croustillant mariné 48h et
              frites coupées main.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              Comptoir & Horaires
            </p>
            <p className="text-sm text-zinc-300">Boulevard du 30 Juin, Gombe, Kinshasa</p>
            <p className="text-sm text-zinc-400 mt-1">Ouvert tous les jours · 11h00 – 23h30</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              Paiements acceptés
            </p>
            <p className="text-sm text-zinc-300">
              M-Pesa, Airtel Money, Orange Money, Africell, Visa & Mastercard.
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} Maison Smash. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6">
            <a href="#menu" className="ms-link-underline hover:text-white transition-colors py-1">
              La Carte
            </a>
            <a
              href="#savoir-faire"
              className="ms-link-underline hover:text-white transition-colors py-1"
            >
              Notre Cuisine
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
