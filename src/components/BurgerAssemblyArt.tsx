import { forwardRef } from 'react';

export interface BurgerLayerRefs {
  topBun: HTMLDivElement | null;
  sauce: HTMLDivElement | null;
  greens: HTMLDivElement | null;
  tomato: HTMLDivElement | null;
  cheddar: HTMLDivElement | null;
  patties: HTMLDivElement | null;
  bottomBun: HTMLDivElement | null;
  shadow: HTMLDivElement | null;
  aura: HTMLDivElement | null;
}

interface BurgerAssemblyArtProps {
  setLayerRef: (key: keyof BurgerLayerRefs) => (el: HTMLDivElement | null) => void;
}

/**
 * Multi-layer transparent 3D-perspective culinary SVG burger composition.
 * Each ingredient layer sits in its own GPU-composited container so GSAP ScrollTrigger
 * can explode, rotate, and assemble all 7 layers smoothly without rectangular occlusion.
 */
export const BurgerAssemblyArt = forwardRef<HTMLDivElement, BurgerAssemblyArtProps>(
  function BurgerAssemblyArt({ setLayerRef }, ref) {
    return (
      <div
        ref={ref}
        className="relative w-[184px] sm:w-[290px] lg:w-[420px] aspect-[440/460] mx-auto select-none pointer-events-none"
        style={{ perspective: '1200px' }}
        aria-hidden="true"
      >
        {/* Warm studio backlight aura behind assembled centerpiece */}
        <div
          ref={setLayerRef('aura')}
          className="absolute inset-x-[6%] top-1/2 -translate-y-1/2 h-[65%] rounded-full opacity-25 blur-3xl will-change-transform"
          style={{
            background:
              'radial-gradient(circle, rgba(217,35,35,0.52) 0%, rgba(245,158,11,0.28) 45%, transparent 74%)',
          }}
        />

        {/* Ground contact cast-iron shadow */}
        <div
          ref={setLayerRef('shadow')}
          className="absolute left-0 right-0 mx-auto bottom-[6%] w-[72%] h-[9%] rounded-full bg-black/75 blur-xl will-change-transform"
        />

        {/* LAYER 7: Toasted Potato Bottom Bun */}
        <div
          ref={setLayerRef('bottomBun')}
          className="absolute left-0 right-0 mx-auto top-[72%] w-[74%] z-[1] will-change-transform"
        >
          <svg viewBox="0 0 360 95" className="w-full h-auto drop-shadow-[0_14px_20px_rgba(0,0,0,0.55)]">
            <defs>
              <linearGradient id="msBottomBunBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E49E4D" />
                <stop offset="48%" stopColor="#C9792B" />
                <stop offset="100%" stopColor="#8E4E16" />
              </linearGradient>
              <linearGradient id="msBottomBunToasted" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F5C77E" />
                <stop offset="100%" stopColor="#C88035" />
              </linearGradient>
            </defs>
            {/* Outer golden base */}
            <path
              d="M22 24 C22 14, 338 14, 338 24 L334 56 C332 78, 280 88, 180 88 C80 88, 28 78, 26 56 Z"
              fill="url(#msBottomBunBody)"
            />
            {/* Toasted buttered rim */}
            <ellipse cx="180" cy="24" rx="158" ry="18" fill="url(#msBottomBunToasted)" />
            <ellipse cx="180" cy="24" rx="142" ry="12" fill="#AD6221" opacity="0.45" />
            {/* Rim specular highlight */}
            <path
              d="M42 35 Q180 49 318 35"
              fill="none"
              stroke="#F9D89C"
              strokeWidth="2"
              opacity="0.35"
            />
          </svg>
        </div>

        {/* LAYER 6: Twin Seared Maillard Smash Patties */}
        <div
          ref={setLayerRef('patties')}
          className="absolute left-0 right-0 mx-auto top-[58%] w-[80%] z-[2] will-change-transform"
        >
          <svg viewBox="0 0 380 125" className="w-full h-auto drop-shadow-[0_14px_18px_rgba(0,0,0,0.6)]">
            <defs>
              <linearGradient id="msPattyCrust" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6D341E" />
                <stop offset="40%" stopColor="#4A2013" />
                <stop offset="80%" stopColor="#2F130B" />
                <stop offset="100%" stopColor="#1D0A06" />
              </linearGradient>
              <linearGradient id="msPattyHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#9A4E2C" />
                <stop offset="50%" stopColor="#72341D" />
                <stop offset="100%" stopColor="#461C10" />
              </linearGradient>
            </defs>
            {/* Bottom Smash Patty with crispy lace skirt */}
            <path
              d="M18 76 C12 68, 22 57, 46 54 L334 54 C358 57, 368 68, 362 76 C366 88, 344 98, 310 100 C250 104, 130 104, 70 100 C36 98, 14 88, 18 76 Z"
              fill="url(#msPattyCrust)"
            />
            {/* Lace crispy edges on lower patty */}
            <path
              d="M15 74 Q26 83 39 76 Q56 85 73 79 Q96 86 118 81 Q145 87 170 82 Q196 87 224 81 Q252 86 278 80 Q306 85 330 78 Q350 82 364 74"
              fill="none"
              stroke="#8B4625"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.7"
            />
            {/* Top Smash Patty */}
            <path
              d="M22 44 C15 35, 28 22, 58 20 L322 20 C352 22, 365 35, 358 44 C361 56, 338 66, 302 68 C242 72, 138 72, 78 68 C42 66, 19 56, 22 44 Z"
              fill="url(#msPattyCrust)"
            />
            <ellipse cx="190" cy="24" rx="154" ry="14" fill="url(#msPattyHighlight)" />
            {/* Caramelized Maillard sear flecks */}
            <g fill="#1A0905" opacity="0.68">
              <ellipse cx="95" cy="25" rx="18" ry="4" />
              <ellipse cx="182" cy="28" rx="26" ry="5" />
              <ellipse cx="268" cy="23" rx="20" ry="4" />
              <circle cx="132" cy="48" r="3" />
              <circle cx="242" cy="51" r="3.5" />
              <circle cx="298" cy="45" r="2.5" />
            </g>
            {/* Cracked black pepper highlights */}
            <g fill="#C9A882" opacity="0.65">
              <circle cx="118" cy="23" r="1.6" />
              <circle cx="212" cy="22" r="1.4" />
              <circle cx="250" cy="27" r="1.6" />
              <circle cx="152" cy="30" r="1.3" />
            </g>
          </svg>
        </div>

        {/* LAYER 5: Twin Melting Aged Cheddar Slices */}
        <div
          ref={setLayerRef('cheddar')}
          className="absolute left-0 right-0 mx-auto top-[51%] w-[79%] z-[3] will-change-transform"
        >
          <svg viewBox="0 0 380 105" className="w-full h-auto drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)]">
            <defs>
              <linearGradient id="msCheddarMain" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD23F" />
                <stop offset="55%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
              <linearGradient id="msCheddarGloss" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFE885" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Melted Cheddar Blanket with thick drips */}
            <path
              d="M36 24 C80 12, 300 12, 344 24 L356 46 C358 58, 336 62, 326 48 C316 64, 302 92, 286 92 C270 92, 265 56, 250 52 C232 58, 224 88, 206 88 C188 88, 182 54, 162 52 C142 56, 132 96, 112 96 C92 96, 88 58, 70 52 C56 58, 42 74, 30 66 C20 58, 26 36, 36 24 Z"
              fill="url(#msCheddarMain)"
            />
            {/* Glossy top cheese highlights */}
            <path
              d="M54 27 Q190 15 326 27 Q290 42 190 42 Q90 42 54 27 Z"
              fill="url(#msCheddarGloss)"
            />
            <ellipse cx="112" cy="84" rx="5" ry="7" fill="#FFE885" opacity="0.45" />
            <ellipse cx="286" cy="80" rx="4" ry="6" fill="#FFE885" opacity="0.45" />
          </svg>
        </div>

        {/* LAYER 4: Heirloom Tomato & Caramelized Red Onion Rings */}
        <div
          ref={setLayerRef('tomato')}
          className="absolute left-0 right-0 mx-auto top-[43%] w-[73%] z-[4] will-change-transform"
        >
          <svg viewBox="0 0 360 88" className="w-full h-auto drop-shadow-[0_10px_14px_rgba(0,0,0,0.4)]">
            <defs>
              <linearGradient id="msTomatoRim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="60%" stopColor="#DC2626" />
                <stop offset="100%" stopColor="#991B1B" />
              </linearGradient>
            </defs>
            {/* Left tomato slice */}
            <g transform="translate(18, 18)">
              <ellipse cx="95" cy="28" rx="86" ry="20" fill="#7F1D1D" />
              <ellipse cx="95" cy="22" rx="86" ry="20" fill="url(#msTomatoRim)" />
              <ellipse cx="95" cy="22" rx="74" ry="14" fill="#F87171" opacity="0.4" />
              <ellipse cx="64" cy="22" rx="18" ry="6" fill="#FEE2E2" opacity="0.45" />
              <ellipse cx="126" cy="22" rx="18" ry="6" fill="#FEE2E2" opacity="0.45" />
            </g>
            {/* Right tomato slice */}
            <g transform="translate(132, 12)">
              <ellipse cx="95" cy="28" rx="84" ry="19" fill="#7F1D1D" />
              <ellipse cx="95" cy="22" rx="84" ry="19" fill="url(#msTomatoRim)" />
              <ellipse cx="95" cy="22" rx="72" ry="13" fill="#F87171" opacity="0.38" />
              <ellipse cx="64" cy="22" rx="17" ry="6" fill="#FEE2E2" opacity="0.45" />
              <ellipse cx="124" cy="22" rx="17" ry="6" fill="#FEE2E2" opacity="0.45" />
            </g>
            {/* Crisp red onion rings on top */}
            <ellipse
              cx="148"
              cy="20"
              rx="48"
              ry="10"
              fill="none"
              stroke="#9D174D"
              strokeWidth="6"
              opacity="0.9"
            />
            <ellipse
              cx="148"
              cy="19"
              rx="48"
              ry="10"
              fill="none"
              stroke="#F472B6"
              strokeWidth="2"
              opacity="0.55"
            />
            <ellipse
              cx="236"
              cy="24"
              rx="44"
              ry="9"
              fill="none"
              stroke="#831843"
              strokeWidth="5.5"
              opacity="0.9"
            />
          </svg>
        </div>

        {/* LAYER 3: Crispy Romaine Lettuce & Dill Pickles */}
        <div
          ref={setLayerRef('greens')}
          className="absolute left-0 right-0 mx-auto top-[35%] w-[78.5%] z-[5] will-change-transform"
        >
          <svg viewBox="0 0 380 86" className="w-full h-auto drop-shadow-[0_8px_12px_rgba(0,0,0,0.4)]">
            <defs>
              <linearGradient id="msLettuceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#84CC16" />
                <stop offset="50%" stopColor="#4D7C0F" />
                <stop offset="100%" stopColor="#365314" />
              </linearGradient>
            </defs>
            {/* Ruffled romaine leaves */}
            <path
              d="M20 44 C12 30, 38 18, 62 28 C82 14, 114 14, 134 26 C158 12, 198 10, 224 24 C248 12, 286 14, 308 28 C332 18, 362 28, 358 46 C348 64, 314 66, 288 54 C264 68, 226 68, 200 54 C172 68, 134 68, 108 54 C80 68, 36 64, 20 44 Z"
              fill="url(#msLettuceGrad)"
            />
            <path
              d="M44 40 Q95 26 144 40 Q190 24 238 40 Q288 26 334 40"
              fill="none"
              stroke="#BEF264"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.65"
            />
            {/* Crisp dill pickle coins */}
            <g transform="translate(86, 12)">
              <ellipse cx="38" cy="18" rx="34" ry="10" fill="#3F6212" />
              <ellipse cx="38" cy="15" rx="34" ry="10" fill="#65A30D" />
              <ellipse cx="38" cy="15" rx="25" ry="6.5" fill="#BEF264" opacity="0.55" />
            </g>
            <g transform="translate(212, 10)">
              <ellipse cx="38" cy="18" rx="34" ry="10" fill="#3F6212" />
              <ellipse cx="38" cy="15" rx="34" ry="10" fill="#65A30D" />
              <ellipse cx="38" cy="15" rx="25" ry="6.5" fill="#BEF264" opacity="0.55" />
            </g>
          </svg>
        </div>

        {/* LAYER 2: Signature Maison Smoked Sauce Swirl */}
        <div
          ref={setLayerRef('sauce')}
          className="absolute left-0 right-0 mx-auto top-[29%] w-[65%] z-[6] will-change-transform"
        >
          <svg viewBox="0 0 320 68" className="w-full h-auto drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]">
            <defs>
              <linearGradient id="msSauceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#EA580C" />
                <stop offset="50%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#C2410C" />
              </linearGradient>
            </defs>
            <path
              d="M28 32 C38 14, 92 14, 104 28 C118 42, 152 12, 178 24 C204 36, 226 14, 260 22 C292 30, 304 42, 282 48 C258 54, 224 40, 198 48 C168 58, 134 40, 106 48 C76 56, 36 48, 28 32 Z"
              fill="url(#msSauceGrad)"
            />
            <path
              d="M52 28 Q84 22 108 33 Q146 20 182 32 Q232 22 272 34"
              fill="none"
              stroke="#FED7AA"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.7"
            />
          </svg>
        </div>

        {/* LAYER 1: Glazed Brioche Top Bun with Sesame Seeds */}
        <div
          ref={setLayerRef('topBun')}
          className="absolute left-0 right-0 mx-auto top-[6.5%] w-[76.5%] z-[7] will-change-transform"
        >
          <svg viewBox="0 0 360 148" className="w-full h-auto drop-shadow-[0_20px_28px_rgba(0,0,0,0.58)]">
            <defs>
              <radialGradient id="msTopBunDome" cx="42%" cy="28%" r="72%">
                <stop offset="0%" stopColor="#FBBF69" />
                <stop offset="42%" stopColor="#DC8834" />
                <stop offset="82%" stopColor="#A65518" />
                <stop offset="100%" stopColor="#7C3A0E" />
              </radialGradient>
              <linearGradient id="msTopBunGlaze" x1="20%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" stopColor="#FFF2D6" stopOpacity="0.62" />
                <stop offset="45%" stopColor="#FCD38D" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Rounded dome */}
            <path
              d="M22 106 C22 44, 88 12, 180 12 C272 12, 338 44, 338 106 C338 122, 314 134, 180 134 C46 134, 22 122, 22 106 Z"
              fill="url(#msTopBunDome)"
            />
            {/* Specular brioche glaze */}
            <ellipse cx="144" cy="54" rx="88" ry="30" fill="url(#msTopBunGlaze)" />
            {/* Bottom warm toasted lip */}
            <path
              d="M28 112 Q180 126 332 112"
              fill="none"
              stroke="#5A2809"
              strokeWidth="5"
              opacity="0.42"
            />
            {/* Roasted sesame seeds */}
            <g fill="#FFF5DF">
              <ellipse cx="110" cy="46" rx="5.5" ry="2.6" transform="rotate(-18 110 46)" />
              <ellipse cx="152" cy="34" rx="5.5" ry="2.6" transform="rotate(14 152 34)" />
              <ellipse cx="198" cy="36" rx="5.5" ry="2.6" transform="rotate(-12 198 36)" />
              <ellipse cx="242" cy="50" rx="5.5" ry="2.6" transform="rotate(22 242 50)" />
              <ellipse cx="86" cy="70" rx="5.2" ry="2.5" transform="rotate(-26 86 70)" />
              <ellipse cx="134" cy="64" rx="5.5" ry="2.6" transform="rotate(8 134 64)" />
              <ellipse cx="182" cy="58" rx="5.5" ry="2.6" transform="rotate(-8 182 58)" />
              <ellipse cx="226" cy="68" rx="5.5" ry="2.6" transform="rotate(18 226 68)" />
              <ellipse cx="270" cy="74" rx="5.2" ry="2.5" transform="rotate(28 270 74)" />
              <ellipse cx="108" cy="88" rx="5" ry="2.4" transform="rotate(-10 108 88)" />
              <ellipse cx="164" cy="82" rx="5.2" ry="2.5" transform="rotate(12 164 82)" />
              <ellipse cx="212" cy="88" rx="5.2" ry="2.5" transform="rotate(-16 212 88)" />
              <ellipse cx="256" cy="92" rx="5" ry="2.4" transform="rotate(10 256 92)" />
            </g>
          </svg>
        </div>
      </div>
    );
  }
);
