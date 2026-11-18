import { ReactNode, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  wrapperClassName?: string;
  href?: string;
  onClick?: () => void;
  strength?: number;
  ariaLabel?: string;
}

export function MagneticButton({
  children,
  className = '',
  wrapperClassName = 'inline-flex',
  href,
  onClick,
  strength = 0.24,
  ariaLabel,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 280, damping: 20, mass: 0.4 });
  const y = useSpring(rawY, { stiffness: 280, damping: 20, mass: 0.4 });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setFinePointer(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const enabled = finePointer && !prefersReduced;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - (rect.left + rect.width / 2);
    const offsetY = e.clientY - (rect.top + rect.height / 2);
    rawX.set(Math.max(-12, Math.min(12, offsetX * strength)));
    rawY.set(Math.max(-8, Math.min(8, offsetY * strength)));
  };

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={enabled ? { x, y } : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={prefersReduced ? undefined : { scale: 0.97 }}
      className={wrapperClassName}
    >
      {href ? (
        <a href={href} aria-label={ariaLabel} onClick={onClick} className={className}>
          {children}
        </a>
      ) : (
        <button type="button" aria-label={ariaLabel} onClick={onClick} className={className}>
          {children}
        </button>
      )}
    </motion.div>
  );
}
