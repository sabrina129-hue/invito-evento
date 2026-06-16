const sparkleColors = [
  "rgba(127, 23, 31, 0.68)",
  "rgba(75, 13, 20, 0.58)",
  "rgba(245, 216, 137, 0.9)",
  "rgba(255, 248, 226, 0.96)",
  "rgba(199, 154, 59, 0.72)",
];

const pieces = Array.from({ length: 54 }, (_, index) => ({
  id: index,
  left: `${(index * 29) % 100}%`,
  delay: `${(index % 18) * 0.11}s`,
  duration: `${4.6 + (index % 8) * 0.32}s`,
  size: `${5 + (index % 4) * 3}px`,
  color: sparkleColors[index % sparkleColors.length],
  drift: `${((index % 9) - 4) * 18}px`,
  shape: index % 3 === 0 ? "sparkle" : "confetto",
}));

export default function WeddingSparkles() {
  return (
    <div className="wedding-sparkles" aria-hidden="true">
      {pieces.map(piece => (
        <span
          key={piece.id}
          className={`wedding-sparkle ${piece.shape}`}
          style={{
            left: piece.left,
            width: piece.size,
            height: piece.size,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            backgroundColor: piece.shape === "confetto" ? piece.color : undefined,
            color: piece.color,
            "--sparkle-drift": piece.drift,
          }}
        />
      ))}
    </div>
  );
}
