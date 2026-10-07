import { IconBrandGithub, IconPlayerPlay } from "@tabler/icons-react";
import { Button } from "../ui/button";
import { Container } from "../ui/container";
import { DownloadButton } from "../ui/download-button";
import { SITE } from "../../_lib/site";

export function HeroSection({ stars }: { stars: number }) {
  return (
    <section
      id="top"
      className="relative overflow-hidden"
      aria-label="Lifestone introduction"
    >
      <HeroGlow />
      <Container
        as="div"
        className="relative flex flex-col items-center gap-12 py-20 text-center md:py-32 lg:py-40"
      >
        <div className="flex flex-col items-center gap-2 mb-2">
          <span className="text-accent-gold uppercase tracking-widest text-sm font-semibold">{SITE.legalName}</span>
          <h1 className="text-balance font-medium tracking-[-0.035em] text-foreground text-[56px] leading-[1.05] sm:text-[72px] md:text-[84px] lg:text-[100px] lg:tracking-[-0.05em]">
            LIFESTONE
          </h1>
        </div>
        <div className="flex max-w-[830px] flex-col items-center gap-6">
          <p className="text-pretty font-medium text-xl leading-[1.5] text-accent-cyan sm:text-2xl md:text-3xl lg:text-4xl lg:leading-[1.2]">
            {SITE.tagline}
          </p>
          <p className="text-pretty text-base leading-[1.6] text-muted-foreground sm:text-lg md:text-xl lg:text-2xl lg:leading-8 max-w-3xl">
            {SITE.shortDescription}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <DownloadButton size="lg" className="px-8 text-lg h-14" />
            <Button
              href="#demo"
              variant="secondary"
              size="lg"
              className="px-8 text-lg h-14 bg-surface hover:bg-surface-strong border-border-strong text-foreground transition-all duration-300"
            >
              <IconPlayerPlay size={20} aria-hidden stroke={2} />
              <span>Watch it in action</span>
            </Button>
          </div>
          <p className="text-[15px] leading-6 text-muted-foreground mt-2">
            Available for Windows and macOS
          </p>
        </div>
        
        <div className="mt-16 animate-bounce">
          <a href="#demo" className="text-muted-foreground hover:text-accent-cyan transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
          </a>
        </div>
      </Container>
    </section>
  );
}

function HeroGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-[700px] w-full max-w-[1440px] opacity-70"
      style={{
        background:
          "radial-gradient(60% 50% at 50% 0%, rgba(25, 215, 255, 0.15) 0%, rgba(22, 119, 255, 0.08) 30%, transparent 70%)",
      }}
    />
  );
}
