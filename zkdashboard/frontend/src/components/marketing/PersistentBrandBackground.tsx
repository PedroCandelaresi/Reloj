'use client';

export function PersistentBrandBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-1 flex items-center justify-center isolate">
      <div className="opacity-18 blur-[10px] saturate-105 scale-105 translate-y-5 mix-blend-normal sm:opacity-20 sm:blur-[12px]">
        <img
          src="/brand/conflunet-isotipo.svg"
          alt=""
          aria-hidden="true"
          className="mx-auto mb-8 h-32 w-32 object-contain sm:mb-10 sm:h-40 sm:w-40"
        />
        <img
          src="/brand/conflunet-wordmark-brushed-steel.svg"
          alt=""
          aria-hidden="true"
          className="mx-auto w-[115vw] object-contain sm:w-[clamp(620px,72vw,1400px)]"
        />
      </div>
    </div>
  );
}