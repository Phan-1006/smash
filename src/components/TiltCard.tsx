import { ReactNode, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  maxTiltDeg?: number;
  darkSpotlight?: boolean;
}

export function TiltCard({
  children,
  className = '',
  maxTiltDeg = 5,
  darkSpotlight = false,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);

  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rotateX = useSpring(rawRotateX, { stiffness: 260, damping: 24, mass: 0.5 });
  const rotateY = useSpring(rawRotateY, { stiffness: 260, damping: 24, mass: 0.5 });

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
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    const rY = (px - 0.5) * maxTiltDeg * 2;
    const rX = -(py - 0.5) * maxTiltDeg * 2;

    rawRotateX.set(rX);
    rawRotateY.set(rY);

    ref.current.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    ref.current.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
  };

  const handleMouseLeave = () => {
    rawRotateX.set(0);
    rawRotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        enabled
          ? {
              transformPerspective: 1100,
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
            }
          : undefined
      }
      className={`ms-spotlight-surface ${darkSpotlight ? 'ms-spotlight-dark' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}
