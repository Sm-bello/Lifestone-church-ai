export const SITE = {
  name: "Lifestone",
  legalName: "WHITE HORSE",
  tagline: "AI Bible Verse Detection & Scripture Projection for Churches",
  shortDescription:
    "Lifestone is free, open-source church presentation software that listens to live sermons, detects Bible verses in real time, and displays Scripture automatically through HDMI, NDI, OBS, and vMix.",
  description:
    "Lifestone is free, open-source church presentation software that listens to live sermons, detects Bible verses in real time, and displays Scripture automatically through HDMI, NDI, OBS, and vMix.",
  url: "https://lifestone-church-ai.vercel.app",
  locale: "en_US",
  twitterHandle: "@whitehorse",
  founded: "2026",
  category: "ChurchSoftware",
  operatingSystems: ["Windows", "macOS"],
  repo: {
    owner: "Sm-bello",
    name: "Lifestone-church-ai",
    url: "https://github.com/Sm-bello/Lifestone-church-ai",
    releasesLatest: "https://github.com/Sm-bello/Lifestone-church-ai/releases/latest",
    discussions: "https://github.com/Sm-bello/Lifestone-church-ai/discussions",
    stars: { fallback: 221 },
  },
  socials: {
    github: "https://github.com/Sm-bello/Lifestone-church-ai",
    twitter: "https://x.com/calvaryarmies",
    linkedin: "https://www.linkedin.com/in/mohammed-bello-sani-369a89284",
    email: "mailto:calvaryarmies@gmail.com",
  },
  stats: {
    languages: "2+",
    translations: "6+",
  },
} as const;

export async function getGitHubStars(): Promise<number> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
      `https://api.github.com/repos/${SITE.repo.owner}/${SITE.repo.name}`,
      { headers }
    );
    if (!res.ok) return SITE.repo.stars.fallback;
    const data = (await res.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === "number"
      ? data.stargazers_count
      : SITE.repo.stars.fallback;
  } catch {
    return SITE.repo.stars.fallback;
  }
}
