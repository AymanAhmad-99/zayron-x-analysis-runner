import { Navbar } from "./components/Navbar";
import { Hero } from "./components/HeroPrecision";
import { TrustStrip } from "./components/TrustStrip";
import { IntelligenceFoundry } from "./components/intelligence-foundry/IntelligenceFoundry";
import { LatestIntelligence } from "./components/LatestIntelligence";
import { PricingSection } from "./components/PricingSection";
import { FinalCtaFooter } from "./components/FinalCtaFooter";

export default function Home() {
  return <main className="site-atmosphere"><div className="page-content"><Navbar /><Hero /><TrustStrip /><IntelligenceFoundry /><LatestIntelligence /><PricingSection /><FinalCtaFooter /></div></main>;
}
