import { Container } from "../ui/container";

export function DemoVideoSection() {
  return (
    <section id="demo" className="relative py-20 bg-background/50">
      <Container className="flex flex-col items-center">
        <div className="text-center mb-12 max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-foreground mb-4">
            See Lifestone in action
          </h2>
          <p className="text-muted-foreground text-lg">
            From spoken words to Scripture on screen — automatically.
          </p>
        </div>

        <div className="relative w-full max-w-5xl aspect-video rounded-xl overflow-hidden border border-border-strong bg-surface-strong shadow-2xl shadow-accent-cyan/10">
          <div className="absolute inset-x-0 top-0 h-8 bg-surface border-b border-border-strong flex items-center px-4 gap-2 z-10">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            <div className="mx-auto text-xs font-medium text-subtle-foreground font-mono">lifestone.whitehorse.com</div>
          </div>
          <video
            src="/demo-video.mp4"
            autoPlay
            loop
            muted
            playsInline
            controls
            className="w-full h-full object-cover pt-8"
          />
        </div>
      </Container>
    </section>
  );
}
