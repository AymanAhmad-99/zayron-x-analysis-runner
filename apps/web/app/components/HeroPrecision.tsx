import { HeroSphere } from "./hero/HeroSphere";

export function Hero() {
  return (
    <section className="hero precision-hero shell" id="top">
      <HeroSphere />
      <div className="hero-scrim" aria-hidden="true" />
      <div className="hero-copy">
        <div className="eyebrow">CYBER THREAT INTELLIGENCE</div>
        <h1>From Threat Evidence to Actionable Intelligence</h1>
        <p>Evidence-driven intelligence connecting vulnerabilities, malware, exploits, threat actors, campaigns, sources and evidence.</p>
        <div className="actions">
          <a className="button primary" href="#intelligence">Explore Intelligence <span aria-hidden="true">↗</span></a>
          <a className="button secondary" href="#evidence">View Latest Evidence</a>
        </div>
      </div>
    </section>
  );
}
