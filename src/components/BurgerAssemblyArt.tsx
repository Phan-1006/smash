import { forwardRef } from 'react';
import topBunImg from '../assets/images/burger_studio_top_bun.png';
import baconImg from '../assets/images/burger_studio_bacon.png';
import tomatoImg from '../assets/images/burger_studio_tomato.png';
import cheddarImg from '../assets/images/burger_studio_cheddar.png';
import pattyImg from '../assets/images/burger_studio_patty.png';
import lettuceImg from '../assets/images/burger_studio_lettuce.png';
import bottomBunImg from '../assets/images/burger_studio_bottom_bun.png';

export interface BurgerLayerRefs {
  topBun: HTMLDivElement | null;
  bacon: HTMLDivElement | null;
  tomato: HTMLDivElement | null;
  cheddar: HTMLDivElement | null;
  patty: HTMLDivElement | null;
  lettuce: HTMLDivElement | null;
  bottomBun: HTMLDivElement | null;
  shadow: HTMLDivElement | null;
  aura: HTMLDivElement | null;
}

interface BurgerAssemblyArtProps {
  setLayerRef: (key: keyof BurgerLayerRefs) => (el: HTMLDivElement | null) => void;
}

interface StudioLayerPlacement {
  refKey: keyof Omit<BurgerLayerRefs, 'shadow' | 'aura'>;
  src: string;
  alt: string;
  className: string;
  imgClassName: string;
}

const STUDIO_LAYER_SPECS: StudioLayerPlacement[] = [
  {
    refKey: 'bottomBun',
    src: bottomBunImg,
    alt: 'Pain brioché inférieur toasté sur grille',
    className: 'absolute left-0 right-0 mx-auto top-[58.13%] w-[72%] z-[1] will-change-transform',
    imgClassName: 'w-full h-auto block drop-shadow-[0_14px_20px_rgba(0,0,0,0.75)]',
  },
  {
    refKey: 'lettuce',
    src: lettuceImg,
    alt: 'Laitue frisée fraîche et croquante',
    className: 'absolute left-0 right-0 mx-auto top-[34.38%] w-[82%] z-[2] will-change-transform',
    imgClassName: 'w-full h-auto block drop-shadow-[0_10px_16px_rgba(0,0,0,0.6)]',
  },
  {
    refKey: 'patty',
    src: pattyImg,
    alt: 'Steak smashé saisi à la braise',
    className: 'absolute left-0 right-0 mx-auto top-[33.33%] w-[78%] z-[3] will-change-transform',
    imgClassName: 'w-full h-auto block drop-shadow-[0_12px_18px_rgba(0,0,0,0.68)]',
  },
  {
    refKey: 'cheddar',
    src: cheddarImg,
    alt: 'Tranche de cheddar affiné fondante',
    className: 'absolute left-0 right-0 mx-auto top-[33.54%] w-[75%] z-[4] will-change-transform',
    imgClassName: 'w-full h-auto block drop-shadow-[0_8px_14px_rgba(0,0,0,0.55)]',
  },
  {
    refKey: 'tomato',
    src: tomatoImg,
    alt: 'Tranches de tomate fraîche',
    className: 'absolute left-0 right-0 mx-auto top-[28.13%] w-[68%] z-[5] will-change-transform',
    imgClassName: 'w-full h-auto block drop-shadow-[0_8px_14px_rgba(0,0,0,0.55)]',
  },
  {
    refKey: 'bacon',
    src: baconImg,
    alt: 'Double bacon fumé croustillant',
    className: 'absolute left-0 right-0 mx-auto top-[19.79%] w-[77%] z-[6] will-change-transform',
    imgClassName: 'w-full h-auto block drop-shadow-[0_8px_12px_rgba(0,0,0,0.55)]',
  },
  {
    refKey: 'topBun',
    src: topBunImg,
    alt: 'Pain brioché doré au sésame',
    className: 'absolute left-0 right-0 mx-auto top-[6.67%] w-[73%] z-[7] will-change-transform',
    imgClassName: 'w-full h-auto block drop-shadow-[0_14px_22px_rgba(0,0,0,0.72)]',
  },
];

/**
 * Multi-layer dark-studio photorealistic burger assembly.
 * Each high-resolution studio cutout renders with clean alpha transparency so GSAP
 * ScrollTrigger suspends all 7 layers in mid-air and seamlessly closes them on scroll.
 */
export const BurgerAssemblyArt = forwardRef<HTMLDivElement, BurgerAssemblyArtProps>(
  function BurgerAssemblyArt({ setLayerRef }, ref) {
    return (
      <div
        ref={ref}
        className="relative w-[220px] sm:w-[300px] lg:w-[430px] aspect-[440/480] mx-auto select-none pointer-events-none"
        style={{ perspective: '1200px' }}
        aria-hidden="true"
      >
        {/* Subtle studio ember glow behind the assembled burger */}
        <div
          ref={setLayerRef('aura')}
          className="absolute inset-x-[10%] top-1/2 -translate-y-1/2 h-[54%] rounded-full opacity-15 blur-3xl will-change-transform"
          style={{
            background:
              'radial-gradient(circle, rgba(217,35,35,0.42) 0%, rgba(245,158,11,0.22) 45%, transparent 74%)',
          }}
        />

        {/* Ground contact shadow */}
        <div
          ref={setLayerRef('shadow')}
          className="absolute left-0 right-0 mx-auto bottom-[8%] w-[64%] h-[8%] rounded-full bg-black/90 blur-xl will-change-transform"
        />

        {STUDIO_LAYER_SPECS.map((spec) => (
          <div key={spec.refKey} ref={setLayerRef(spec.refKey)} className={spec.className}>
            <img
              src={spec.src}
              alt={spec.alt}
              decoding="async"
              className={spec.imgClassName}
            />
          </div>
        ))}
      </div>
    );
  }
);
