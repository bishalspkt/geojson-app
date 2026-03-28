export default function PoweredBy() {
  return (
    <a
      href="https://geojson.app"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-2 right-2 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium no-underline hover:bg-black/80 transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      geojson.app
    </a>
  );
}
