import React from "react";
import "../css/about.css";

const About = () => (
  <section className="section">
    <div className="container about-wrap">
      <span className="eyebrow">Our Story</span>
      <h1>A home kitchen, shared with the neighbourhood</h1>
      <p>
        Chamundeshwari Home Sweets &amp; Hots started the way most good things do — in a home
        kitchen, with recipes passed down and perfected over years. Every batch of laddu,
        burfi, and crunchy hots is still made in small quantities, the traditional way,
        with quality ghee and no shortcuts.
      </p>
      <p>
        We weigh everything to the gram so you only pay for exactly what you need, whether
        that's a quick 50g taste of something new or a full kilo for a festival. Every order
        is packed fresh, never from cold storage.
      </p>
      <div className="about-values">
        <div className="card about-value">
          <h3>Fresh Daily</h3>
          <p>Small batches made close to order time, not stockpiled.</p>
        </div>
        <div className="card about-value">
          <h3>Weighed Precisely</h3>
          <p>50g to 1kg, priced exactly to the gram, no rounding up.</p>
        </div>
        <div className="card about-value">
          <h3>Traditional Recipes</h3>
          <p>Family recipes for sweets and hots, unchanged over the years.</p>
        </div>
      </div>
    </div>
  </section>
);

export default About;
