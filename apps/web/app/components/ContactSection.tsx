"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Contact surface.
 *
 * The previous implementation rendered a form whose submit handler only flipped
 * local state — it never transmitted the values, yet told users "our analysts
 * will reach out". That is a misleading product representation, so the form was
 * removed. This section now presents the two operational email channels and does
 * not imply that any submission was delivered.
 */
export function ContactSection() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        io.disconnect();
      }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="contact-section shell" id="contact" aria-labelledby="contact-heading">
      <div className="contact-copy">
        <div className="eyebrow">GOT A THREAT TO INVESTIGATE?</div>
        <h2 id="contact-heading">Get the intelligence you need, when you need it.</h2>
        <p>Brief our analysts on the signal you're tracking — we respond with the evidence picture, not a sales deck.</p>
        <a className="button primary" href="#contact-channels">Contact the team <span aria-hidden="true">↗</span></a>
      </div>
      <div className="contact-card-wrap" ref={cardRef}>
        <div className="contact-glow" aria-hidden="true" />
        <div className={`contact-card ${visible ? "in-view" : ""}`} id="contact-channels">
          <p className="contact-card-intro">Two operational channels reach the team directly:</p>
          <ul className="contact-channels" aria-label="Contact channels">
            <li>
              <strong>Security &amp; disclosure</strong>
              <span>Vulnerability disclosure, incident reports, abuse notices and security questionnaires.</span>
              <a href="mailto:security@zayron-x.co">security@zayron-x.co</a>
            </li>
            <li>
              <strong>Institutional &amp; commercial</strong>
              <span>General enquiries, procurement, contracts, DPA requests and partnerships.</span>
              <a href="mailto:contact@zayron-x.co">contact@zayron-x.co</a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
