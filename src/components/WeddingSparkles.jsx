const sparkleColors = [
  "rgba(255, 248, 226, 0.98)",
  "rgba(255, 232, 139, 0.98)",
  "rgba(255, 214, 92, 0.96)",
  "rgba(255, 255, 255, 0.98)",
  "rgba(245, 216, 137, 0.94)",
];

const pieces = Array.from({ length: 620 }, (_, index) => ({
  id: index,
  left: `${(index * 17) % 100}%`,
  delay: `${(index % 96) * 0.035}s`,
  duration: `${3.2 + (index % 12) * 0.12}s`,
  size: index % 10 === 0
    ? `${3.8 + (index % 3) * 0.45}px`
    : index % 5 === 0 || index % 5 === 1
      ? `${2.35 + (index % 3) * 0.35}px`
      : `${1.05 + (index % 4) * 0.28}px`,
  color: sparkleColors[index % sparkleColors.length],
  drift: `${((index % 17) - 8) * 6}px`,
  shape: "glitter",
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
            backgroundColor: piece.shape === "firefly" ? piece.color : undefined,
            color: piece.color,
            "--sparkle-drift": piece.drift,
          }}
        />
      ))}
    </div>
  );
}
