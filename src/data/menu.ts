export type MenuCategory = 'all' | 'burgers' | 'pizzas' | 'chicken' | 'sides' | 'drinks';

export interface MenuAddon {
  id: string;
  label: string;
  priceUsd: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: Exclude<MenuCategory, 'all'>;
  categoryLabel: string;
  calories: string;
  description: string;
  priceUsd: number;
  image: string;
  tag?: string;
  available: boolean;
  supportsCombo: boolean;
  comboExtraUsd: number;
  addons: MenuAddon[];
}

export const USD_TO_CDF_RATE = 2850;
export const DELIVERY_FEE_USD = 2.5;
export const FREE_DELIVERY_THRESHOLD_USD = 30;

export const PROMO_CODES: Record<string, { rate: number; label: string }> = {
  SMASH10: { rate: 0.1, label: '-10% sur votre commande' },
  PIZZA15: { rate: 0.15, label: '-15% spécial lancement Pizza' },
};

export const IMAGE_PRESETS: { label: string; url: string }[] = [
  { label: 'Classic Smash Burger', url: '/src/assets/images/burger_classic_smash_1794856488329.jpg' },
  { label: 'Truffle & Bacon Burger', url: '/src/assets/images/burger_truffle_bacon_1794856487896.jpg' },
  { label: 'Signature Maison Burger', url: '/src/assets/images/hero_smash_burger_1794856487440.jpg' },
  { label: 'Smash Studio Smoke (Campaign)', url: '/src/assets/images/hero_cinematic_smash_1795260047387.jpg' },
  { label: 'Pizza Margherita Burrata', url: '/src/assets/images/pizza_margherita_burrata_1794857894126.jpg' },
  { label: 'Pizza Pepperoni Hot Honey', url: '/src/assets/images/pizza_pepperoni_hot_honey_1794857894815.jpg' },
  { label: 'Pizza Overhead Studio', url: '/src/assets/images/pizza_overhead_editorial_1795265770611.jpg' },
  { label: 'Pizza Truffe & Champignons', url: '/src/assets/images/pizza_truffle_mushroom_1794857895107.jpg' },
  { label: 'Crispy Chicken Burger', url: '/src/assets/images/chicken_crispy_burger_1794856488933.jpg' },
  { label: 'Tenders Croustillants', url: '/src/assets/images/tenders_crispy_box_1794856488897.jpg' },
  { label: 'Plateau Crispy & Frites (Campaign)', url: '/src/assets/images/crispy_chicken_campaign_1795265770266.jpg' },
  { label: 'Frites Coupées Main', url: '/src/assets/images/fries_loaded_box_1794856489833.jpg' },
  { label: 'Milkshake Caramel', url: '/src/assets/images/shake_vanilla_caramel_1794856489450.jpg' },
  { label: 'Milkshake Studio Portrait', url: '/src/assets/images/milkshake_studio_campaign_1795265770716.jpg' },
];

export function formatMoney(
  amountUsd: number,
  currency: 'USD' | 'CDF',
  usdToCdfRate: number = USD_TO_CDF_RATE
): string {
  if (currency === 'CDF') {
    const cdf = Math.round(amountUsd * usdToCdfRate);
    return `${cdf.toLocaleString('fr-FR')} FC`;
  }
  return `$${amountUsd.toFixed(2)}`;
}

export function convertUsdAmount(
  amountUsd: number,
  currency: 'USD' | 'CDF',
  usdToCdfRate: number = USD_TO_CDF_RATE
): number {
  if (currency === 'CDF') {
    return Math.round(amountUsd * usdToCdfRate);
  }
  return Number(amountUsd.toFixed(2));
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'classic-double-smash',
    name: 'Le Classic Smash',
    category: 'burgers',
    categoryLabel: 'Smash Burger',
    calories: '680 kcal',
    description:
      'Double steak de bœuf Charolais smashé sur plancha, double cheddar américain affiné, pickles d’aneth croquants, oignons blancs et sauce secrète Maison en pain potato.',
    priceUsd: 11.5,
    image: '/src/assets/images/burger_classic_smash_1794856488329.jpg',
    tag: 'Signature',
    available: true,
    supportsCombo: true,
    comboExtraUsd: 4.5,
    addons: [
      { id: 'extra-patty', label: 'Steak smashé supplémentaire', priceUsd: 3.5 },
      { id: 'extra-cheddar', label: 'Double cheddar affiné', priceUsd: 1.5 },
      { id: 'smoked-bacon', label: 'Bacon fumé croustillant', priceUsd: 2.5 },
      { id: 'extra-sauce', label: 'Pot de sauce Maison', priceUsd: 0.8 },
    ],
  },
  {
    id: 'truffle-bacon-smash',
    name: 'Truffle & Bacon Smash',
    category: 'burgers',
    categoryLabel: 'Smash Burger',
    calories: '790 kcal',
    description:
      'Double bœuf smashé caramélisé, poitrine fumée épaisse grillée, gruyère fondant, aïoli à la truffe noire du Périgord et roquette fraîche sur pain brioché au sésame noir.',
    priceUsd: 14.5,
    image: '/src/assets/images/burger_truffle_bacon_1794856487896.jpg',
    tag: 'Chef',
    available: true,
    supportsCombo: true,
    comboExtraUsd: 4.5,
    addons: [
      { id: 'extra-patty', label: 'Steak smashé supplémentaire', priceUsd: 3.5 },
      { id: 'extra-bacon', label: 'Double bacon fumé', priceUsd: 2.5 },
      { id: 'truffle-dip', label: 'Pot d’aïoli truffe noire', priceUsd: 1.5 },
    ],
  },
  {
    id: 'maison-triple-crust',
    name: 'Signature Maison Smash',
    category: 'burgers',
    categoryLabel: 'Smash Burger',
    calories: '740 kcal',
    description:
      'Double croûte dentelée saisie à haute température, cheddar vieilli, tomates cœur de bœuf, oignons rouges croquants, laitue romaine et sauce fumée relevée.',
    priceUsd: 13.0,
    image: '/src/assets/images/hero_smash_burger_1794856487440.jpg',
    available: true,
    supportsCombo: true,
    comboExtraUsd: 4.5,
    addons: [
      { id: 'extra-patty', label: 'Steak smashé supplémentaire', priceUsd: 3.5 },
      { id: 'jalapenos', label: 'Piments jalapeños marinés', priceUsd: 1.0 },
      { id: 'smoked-bacon', label: 'Bacon fumé croustillant', priceUsd: 2.5 },
    ],
  },
  {
    id: 'pizza-margherita-burrata',
    name: 'Pizza Margherita Burrata',
    category: 'pizzas',
    categoryLabel: 'Pizza Artisanale',
    calories: '820 kcal',
    description:
      'Pâte au levain fermentée 72h cuite sur pierre, sauce tomate San Marzano, mozzarella fior di latte, burrata crémeuse entière, basilic frais et huile d’olive vierge.',
    priceUsd: 14.0,
    image: '/src/assets/images/pizza_margherita_burrata_1794857894126.jpg',
    tag: 'Nouveau',
    available: true,
    supportsCombo: true,
    comboExtraUsd: 4.0,
    addons: [
      { id: 'extra-burrata', label: 'Burrata crémeuse supplémentaire', priceUsd: 4.0 },
      { id: 'chili-oil', label: 'Huile pimentée maison', priceUsd: 0.8 },
      { id: 'parmesan', label: 'Copeaux de Parmigiano 24 mois', priceUsd: 1.8 },
    ],
  },
  {
    id: 'pizza-pepperoni-hot-honey',
    name: 'Pizza Pepperoni & Hot Honey',
    category: 'pizzas',
    categoryLabel: 'Pizza Artisanale',
    calories: '910 kcal',
    description:
      'Double pepperoni croustillant en coupelles, mozzarella fondante dorée, sauce tomate épicée aux herbes, origan sauvage et filet de miel infusé au piment.',
    priceUsd: 16.0,
    image: '/src/assets/images/pizza_pepperoni_hot_honey_1794857894815.jpg',
    tag: 'Best-Seller',
    available: true,
    supportsCombo: true,
    comboExtraUsd: 4.0,
    addons: [
      { id: 'extra-pepperoni', label: 'Double portion pepperoni', priceUsd: 3.0 },
      { id: 'extra-hot-honey', label: 'Pot de miel pimenté', priceUsd: 1.2 },
      { id: 'extra-mozz', label: 'Extra mozzarella fior di latte', priceUsd: 2.0 },
    ],
  },
  {
    id: 'pizza-truffle-mushroom',
    name: 'Pizza Truffe & Champignons',
    category: 'pizzas',
    categoryLabel: 'Pizza Artisanale',
    calories: '860 kcal',
    description:
      'Base crème à la truffe noire, champignons sauvages rôtis au thym, oignons rouges caramélisés, mozzarella fior di latte et poivre noir concassé.',
    priceUsd: 17.5,
    image: '/src/assets/images/pizza_truffle_mushroom_1794857895107.jpg',
    tag: 'Chef',
    available: true,
    supportsCombo: true,
    comboExtraUsd: 4.0,
    addons: [
      { id: 'truffle-oil', label: 'Filet d’huile de truffe blanche', priceUsd: 2.5 },
      { id: 'roquette', label: 'Bouquet de roquette fraîche', priceUsd: 1.2 },
      { id: 'parmesan', label: 'Copeaux de Parmigiano 24 mois', priceUsd: 1.8 },
    ],
  },
  {
    id: 'crispy-hot-chicken',
    name: 'Crispy Hot Honey Chicken',
    category: 'chicken',
    categoryLabel: 'Poulet Croustillant',
    calories: '650 kcal',
    description:
      'Haut de cuisse fermier mariné 48h au babeurre et épices, panure ultra-croustillante minute, coleslaw au chou rouge croquant et glaçage au miel pimenté.',
    priceUsd: 12.0,
    image: '/src/assets/images/chicken_crispy_burger_1794856488933.jpg',
    tag: 'Populaire',
    available: true,
    supportsCombo: true,
    comboExtraUsd: 4.5,
    addons: [
      { id: 'extra-cheddar', label: 'Tranche de cheddar fondant', priceUsd: 1.5 },
      { id: 'extra-hot-honey', label: 'Glaçage miel pimenté extra', priceUsd: 1.0 },
      { id: 'pickles', label: 'Pickles croquants', priceUsd: 0.7 },
    ],
  },
  {
    id: 'crispy-tenders-5pcs',
    name: 'Tenders Croustillants (5 pcs)',
    category: 'chicken',
    categoryLabel: 'Poulet Croustillant',
    calories: '540 kcal',
    description:
      'Cinq aiguillettes de poulet fermier préparées à la commande dans notre chapelure croustillante, servies avec deux sauces maison : BBQ fumé et Ranch aux herbes.',
    priceUsd: 10.5,
    image: '/src/assets/images/tenders_crispy_box_1794856488897.jpg',
    available: true,
    supportsCombo: true,
    comboExtraUsd: 4.0,
    addons: [
      { id: 'extra-tenders', label: '+2 Tenders supplémentaires', priceUsd: 3.8 },
      { id: 'ranch-dip', label: 'Pot de sauce Ranch maison', priceUsd: 0.8 },
      { id: 'bbq-dip', label: 'Pot de sauce BBQ fumée', priceUsd: 0.8 },
    ],
  },
  {
    id: 'hand-cut-fries',
    name: 'Frites Coupées Main',
    category: 'sides',
    categoryLabel: 'Accompagnement',
    calories: '380 kcal',
    description:
      'Pommes de terre fraîches coupées chaque matin avec leur peau, double cuisson croustillante, fleur de sel, persil haché et mayonnaise épicée maison.',
    priceUsd: 5.0,
    image: '/src/assets/images/fries_loaded_box_1794856489833.jpg',
    available: true,
    supportsCombo: false,
    comboExtraUsd: 0,
    addons: [
      { id: 'cheddar-sauce', label: 'Nappage cheddar fondu', priceUsd: 2.0 },
      { id: 'spicy-mayo', label: 'Pot de mayo épicée extra', priceUsd: 0.8 },
    ],
  },
  {
    id: 'salted-caramel-shake',
    name: 'Milkshake Vanille & Caramel',
    category: 'drinks',
    categoryLabel: 'Boisson Glacée',
    calories: '460 kcal',
    description:
      'Crème glacée artisanale à la gousse de vanille de Madagascar, tourbillon de caramel au beurre salé et crème fouettée montée à la minute.',
    priceUsd: 6.5,
    image: '/src/assets/images/shake_vanilla_caramel_1794856489450.jpg',
    available: true,
    supportsCombo: false,
    comboExtraUsd: 0,
    addons: [
      { id: 'extra-caramel', label: 'Coulis caramel beurre salé extra', priceUsd: 1.0 },
    ],
  },
];
