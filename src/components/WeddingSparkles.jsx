const sparkleColors = [
  "rgba(255, 248, 226, 0.98)",
  "rgba(255, 232, 139, 0.98)",
  "rgba(255, 214, 92, 0.96)",
  "rgba(255, 255, 255, 0.98)",
  "rgba(245, 216, 137, 0.94)",
];

const seededRandom = (index, salt) => {
  const value = Math.sin((index + 1) * (12.9898 + salt * 4.1414)) * 43758.5453;
  return value - Math.floor(value);
};

const toUnit = (value, unit) => `${Number(value.toFixed(3))}${unit}`;

const pieces = Array.from({ length: 620 }, (_, index) => {
  const delaySeed = seededRandom(index, 2);
  const sizeSeed = seededRandom(index, 5);
  const delay = delaySeed < 0.82
    ? -seededRandom(index, 3) * 1.25
    : seededRandom(index, 4) * 0.22;
  const size = sizeSeed > 0.9
    ? 3.8 + seededRandom(index, 6) * 1.25
    : sizeSeed > 0.56
      ? 2.1 + seededRandom(index, 7) * 1.05
      : 0.95 + seededRandom(index, 8) * 0.9;

  return {
    id: index,
    left: toUnit(seededRandom(index, 1) * 100, "%"),
    delay: toUnit(delay, "s"),
    duration: toUnit(2.9 + seededRandom(index, 9) * 1.9, "s"),
    size: toUnit(size, "px"),
    color: sparkleColors[Math.floor(seededRandom(index, 10) * sparkleColors.length)],
    drift: toUnit((seededRandom(index, 11) - 0.5) * 150, "px"),
    shape: "glitter",
  };
});

export default function WeddingSparkles() {
  const visiblePieces = typeof window !== "undefined" && window.matchMedia("(max-width: 480px)").matches
    ? pieces.slice(0, 380)
    : pieces;

  return (
    <div className="wedding-sparkles" aria-hidden="true">
      {visiblePieces.map(piece => (
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
