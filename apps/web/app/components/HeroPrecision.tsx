import { HeroSphere } from "./hero/HeroSphere";

export function Hero() {
  return (
    <section className="hero precision-hero shell" id="top">
      <HeroSphere />
      <div className="hero-scrim" aria-hidden="true" />
      <div className="hero-copy">
        <div className="eyebrow">INDEPENDENT CYBER THREAT INTELLIGENCE</div>
        <p className="hero-motto">Truth Is the Perimeter.</p>
        <h1>Verifiable threat intelligence, published at the source.</h1>
        <p>
          ZAYRON-X reconciles primary authoritative feeds into evidence-locked CVE advisories and static malware
          dossiers. Every published fact carries its source, its observation time and its confidence state.
        </p>
        <div className="actions">
          <a className="button primary" href="#latest-intelligence">
            View verified intelligence <span aria-hidden="true">↗</span>
          </a>
          <a className="button secondary" href="/methodology">
            Read the methodology
          </a>
        </div>
      </div>
    </section>
  );
}
