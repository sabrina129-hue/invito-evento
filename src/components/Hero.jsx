import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Hero({ images, children }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setIndex(prev => (prev + 1) % images.length), 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-t-card">
      <AnimatePresence mode="wait">
        <motion.img
          key={index}
          src={images[index]}
          alt="Hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white"></div>

      <div className="absolute inset-0 flex items-end justify-center text-center text-white drop-shadow">
        {children}
      </div>
    </div>
  );
}
