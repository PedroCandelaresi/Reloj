'use client';

export function BackgroundTextureLayer() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,190,0.13),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(0,120,255,0.08),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(0,255,160,0.08),transparent_38%),#020807]" />

      {/* Subtle organic texture - no grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(31,199,119,0.06),transparent_45%),radial-gradient(circle_at_70%_60%,rgba(55,240,166,0.04),transparent_40%),radial-gradient(circle_at_10%_90%,rgba(120,255,210,0.05),transparent_35%)]" />

      {/* Very subtle noise texture */}
      <div className="absolute inset-0 opacity-[0.035] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjQiLz48L3N2Zz4=')]" />
    </div>
  );
}