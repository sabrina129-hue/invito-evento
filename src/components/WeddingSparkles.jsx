const sparkleColors = [
  "rgba(83, 91, 46, 0.72)",
  "rgba(122, 135, 84, 0.62)",
  "rgba(246, 232, 192, 0.88)",
  "rgba(255, 252, 244, 0.94)",
  "rgba(180, 151, 84, 0.64)",
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
