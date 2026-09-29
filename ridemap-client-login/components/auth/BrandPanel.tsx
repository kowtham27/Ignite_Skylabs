import Image from "next/image";
import { Bot, Clock, MapPin, UserCheck, type LucideIcon } from "lucide-react";
import { TiltCard } from "@/components/effects/TiltCard";
import { RouteAnimation } from "./RouteAnimation";

const FEATURES: { label: string; icon: LucideIcon }[] = [
  { label: "Live GPS", icon: MapPin },
  { label: "Accurate ETAs", icon: Clock },
  { label: "Auto attendance", icon: UserCheck },
  { label: "Gogo chatbot", icon: Bot },
];

function Logo() {
  return (
    <Image
      src="/ridemap/fullIcon.png"
      alt="Ridemap"
      width={532}
      height={128}
      priority
      sizes="(min-width: 1024px) 170px, 135px"
      className="h-8 w-auto self-center lg:h-10 lg:self-start"
    />
  );
}

export function BrandPanel() {
  return (
    <>
      {/* Mobile / tablet header */}
      <header className="flex shrink-0 flex-col items-center gap-2 px-4 pt-6 text-center sm:gap-3 sm:pt-10 lg:hidden [@media(max-height:620px)]:pt-4">
        <Logo />
        <p className="max-w-xs text-sm text-rm-muted">Real-time Bus Tracking &amp; Campus Transport Management</p>
        {/* Features, compact — only when the screen is tall enough to keep the card fully visible */}
        <ul className="hidden max-w-sm flex-wrap justify-center gap-1.5 [@media(min-height:680px)]:flex">
          {FEATURES.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="flex items-center gap-1.5 rounded-full border border-rm-border bg-rm-raised/60 px-2.5 py-1 text-xs font-medium"
            >
              <Icon className="h-3.5 w-3.5 text-rm-lime" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </header>

      {/* Desktop brand panel */}
      <section
        aria-label="About Ridemap"
        className="hidden h-dvh min-h-0 flex-col justify-center gap-6 px-12 py-8 lg:flex xl:px-20 [@media(min-height:860px)]:gap-8 [@media(min-height:860px)]:py-12"
      >
        <Logo />
        <div className="shrink-0 space-y-3">
          <p className="max-w-xl text-3xl font-bold leading-tight tracking-tight [@media(min-height:760px)]:text-4xl xl:[@media(min-height:860px)]:text-5xl">
            Real-time Bus Tracking &amp;{" "}
            <span className="rm-shimmer bg-gradient-to-r from-rm-lime via-rm-green to-rm-lime bg-clip-text text-transparent">
              Campus Transport
            </span>{" "}
            Management
          </p>
          <p className="text-lg text-rm-muted">Track every campus bus live, from one panel.</p>
        </div>

        {/* Map takes whatever height is left and keeps its 14:9 shape */}
        <div className="min-h-0 w-full max-w-xl flex-1 [container-type:size]">
          <TiltCard className="w-[min(100cqw,calc(100cqh*14/9))]">
            <div className="rounded-card border border-rm-border shadow-2xl shadow-black/40">
              <RouteAnimation />
            </div>
          </TiltCard>
        </div>

        <ul className="flex max-w-xl shrink-0 flex-wrap gap-3">
          {FEATURES.map(({ label, icon: Icon }, i) => (
            <li
              key={label}
              style={{ animationDelay: `${0.3 + i * 0.08}s` }}
              className="rm-rise group flex cursor-default items-center gap-2 rounded-full border border-rm-border bg-rm-raised/60 px-4 py-2 text-sm font-medium transition duration-200 ease-out hover:-translate-y-1 hover:scale-105 hover:border-rm-lime/50 hover:bg-rm-raised hover:shadow-[0_10px_28px_-10px_var(--rm-lime-glow)]"
            >
              <Icon
                className="h-4 w-4 text-rm-lime transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-125"
                aria-hidden="true"
              />
              {label}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
