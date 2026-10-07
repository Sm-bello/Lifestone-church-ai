import {
  IconMicrophone,
  IconBook,
  IconBolt,
  IconLanguage,
  IconLock,
  IconAdjustmentsHorizontal,
} from "@tabler/icons-react";
import { Container } from "../ui/container";
import { FeatureCard } from "../ui/feature-card";
import { Reveal } from "../ui/reveal";
import { SectionHeading } from "./section-heading";

import type { Icon as TablerIcon } from "@tabler/icons-react";

type Feature = {
  icon: TablerIcon;
  title: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    icon: IconMicrophone,
    title: "Real-time transcription",
    body: "Listen to sermons as they happen with high-accuracy voice recognition tailored for spoken ministry.",
  },
  {
    icon: IconBook,
    title: "Scripture detection",
    body: "Recognize explicit references and seamlessly identify quoted passages without manual entry.",
  },
  {
    icon: IconBolt,
    title: "Instant overlays",
    body: "Send Scripture directly into your broadcast workflow the moment it is detected in speech.",
  },
  {
    icon: IconLanguage,
    title: "Multiple translations",
    body: "Switch Bible translations seamlessly during the service to match the pastor's context.",
  },
  {
    icon: IconLock,
    title: "Local-first processing",
    body: "Run advanced AI speech recognition completely locally with Whisper when configured.",
  },
  {
    icon: IconAdjustmentsHorizontal,
    title: "Broadcast control",
    body: "Designed for real production environments with HDMI projector flows and upcoming NDI support.",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="py-20 lg:py-[120px]"
    >
      <Container className="flex flex-col gap-10 md:gap-14">
        <Reveal>
          <SectionHeading id="features-heading">
            Built for live ministry
          </SectionHeading>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 md:[&>*]:-ml-px md:[&>*]:-mt-px lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80} className="flex">
              <FeatureCard
                icon={f.icon}
                title={f.title}
                body={f.body}
                iconTone="accent"
              />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
