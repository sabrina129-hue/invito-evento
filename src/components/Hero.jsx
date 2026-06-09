import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MotionImage = motion.img;

export default function Hero({ images, children }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setIndex(prev => (prev + 1) % images.length), 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-t-card bg-surface">
      <AnimatePresence mode="wait">
        <MotionImage
          key={index}
          src={images[index]}
          alt="Hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="hero-image absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>

      <div className="absolute inset-0 flex items-end justify-center pb-8 text-center text-white drop-shadow">
        {children}
      </div>
    </div>
  );
}
