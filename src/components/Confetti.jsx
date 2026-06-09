const confettiColors = [
  "var(--color-primary)",
  "var(--color-secondary)",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#10B981",
  "#EC4899",
];

const pieces = Array.from({ length: 48 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  delay: `${(index % 12) * 0.12}s`,
  duration: `${3.2 + (index % 7) * 0.28}s`,
  color: confettiColors[index % confettiColors.length],
  width: `${6 + (index % 4) * 2}px`,
  height: `${10 + (index % 5) * 2}px`,
  rotate: `${(index * 29) % 180}deg`,
  drift: `${((index % 9) - 4) * 18}px`,
}));

export default function Confetti() {
  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map(piece => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={{
            left: piece.left,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            backgroundColor: piece.color,
            width: piece.width,
            height: piece.height,
            transform: `rotate(${piece.rotate})`,
            "--confetti-drift": piece.drift,
          }}
        />
      ))}
    </div>
  );
}
