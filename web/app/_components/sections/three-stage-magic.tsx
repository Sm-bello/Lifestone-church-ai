import { Container } from "../ui/container";

export function ThreeStageMagic() {
  return (
    <section className="relative py-24 border-y border-border-strong bg-surface">
      <Container className="flex flex-col items-center text-center">
        <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-foreground mb-16">
          From sermon to Scripture. <span className="text-accent-gold">Instantly.</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 w-full max-w-5xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-strong border border-border flex items-center justify-center text-3xl mb-2 shadow-[0_0_15px_rgba(25,215,255,0.15)]">
              🎙️
            </div>
            <h3 className="text-xl font-semibold text-foreground">01 — Listen</h3>
            <p className="text-muted-foreground text-pretty">
              Lifestone listens to the live sermon in real time, converting spoken words directly into text on your machine.
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-4 text-center relative">
            <div className="hidden md:block absolute top-8 -left-8 w-16 h-[2px] bg-gradient-to-r from-accent/0 via-accent/50 to-accent/0"></div>
            <div className="w-16 h-16 rounded-full bg-surface-strong border border-border flex items-center justify-center text-3xl mb-2 shadow-[0_0_15px_rgba(25,215,255,0.15)] text-accent-cyan">
              ✦
            </div>
            <h3 className="text-xl font-semibold text-foreground">02 — Understand</h3>
            <p className="text-muted-foreground text-pretty">
              AI instantly identifies Scripture references and contextual quotations from the live transcription.
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-4 text-center relative">
            <div className="hidden md:block absolute top-8 -left-8 w-16 h-[2px] bg-gradient-to-r from-accent/0 via-accent/50 to-accent/0"></div>
            <div className="w-16 h-16 rounded-full bg-surface-strong border border-border flex items-center justify-center text-3xl mb-2 shadow-[0_0_15px_rgba(244,201,93,0.15)] text-accent-gold">
              ▣
            </div>
            <h3 className="text-xl font-semibold text-foreground">03 — Display</h3>
            <p className="text-muted-foreground text-pretty">
              The detected passage immediately appears as a broadcast-ready overlay via NDI or HDMI.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
