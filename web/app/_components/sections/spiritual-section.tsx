import { Container } from "../ui/container";

export function SpiritualSection() {
  return (
    <section className="relative py-24 md:py-32 bg-background overflow-hidden border-t border-border-strong">
      {/* Subtle glow behind the verse */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mx-auto h-full w-full max-w-[1000px] opacity-30"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(244, 201, 93, 0.1) 0%, transparent 60%)",
        }}
      />
      
      <Container className="flex flex-col items-center text-center relative z-10">
        <div className="w-12 h-12 mb-8 text-accent-gold/80 flex items-center justify-center">
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor">
             <path d="M12 2L15 8H22L17 13L19 20L12 16L5 20L7 13L2 8H9L12 2Z" />
          </svg>
        </div>
        
        <blockquote className="max-w-4xl mx-auto">
          <p className="text-2xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground leading-tight mb-8 font-serif italic">
            "Let all things be done decently and in order."
          </p>
          <footer className="text-accent-gold tracking-widest uppercase text-sm font-semibold">
            — 1 Corinthians 14:40
          </footer>
        </blockquote>
      </Container>
    </section>
  );
}
