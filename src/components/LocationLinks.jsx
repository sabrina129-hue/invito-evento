export default function LocationLinks({ locations }) {
  return (
    <div className="flex flex-wrap justify-center gap-4">
      {Object.values(locations).map((loc) => (
        <a key={loc.label} href={loc.url} target="_blank" rel="noopener noreferrer" className="btn">
          {loc.label}
        </a>
      ))}
    </div>
  );
}
