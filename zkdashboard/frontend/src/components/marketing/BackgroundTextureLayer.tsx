'use client';

export function BackgroundTextureLayer() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(31,199,119,0.28),transparent_35%),radial-gradient(circle_at_78%_16%,rgba(55,240,166,0.18),transparent_30%),linear-gradient(180deg,#050909_0%,#060d0d_54%,#040707_100%)]" />

      {/* Technical grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(120,255,210,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(120,255,210,0.045)_1px,transparent_1px)] bg-[size:48px_48px] opacity-60" />

      {/* Enhanced radial textures for glassmorphism */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(31,199,119,0.08),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(55,240,166,0.06),transparent_55%),radial-gradient(circle_at_40%_80%,rgba(31,199,119,0.07),transparent_55%),radial-gradient(circle_at_60%_30%,rgba(120,255,210,0.04),transparent_50%)]" />

      {/* Subtle noise texture */}
      <div className="absolute inset-0 opacity-[0.035] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjQiLz48L3N2Zz4=')]" />
    </div>
  );
}