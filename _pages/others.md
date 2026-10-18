---
layout: page
title: Service
subtitle: "Peer review, committee roles, and leadership beyond research."
permalink: /others/
description: "Academic service by Sravanth Kodavanti — Area Chair and reviewer for ICASSP, ACL, NeurIPS, ICML, ICLR and AAAI venues, plus leadership roles at IIT Hyderabad."
order: 6
nav_divider_after: true
---

<section class="section">
  <div class="section-head"><h2>Program committees</h2></div>
  <div class="card-list">
    <article class="card">
      <h3>Area Chair</h3>
      <ul class="plain-list">
        {% for a in site.data.service.area_chair %}
        <li><span class="venue-badge">{{ a.venue }}</span> {{ a.detail }}</li>
        {% endfor %}
      </ul>
    </article>
    <article class="card">
      <h3>Reviewer</h3>
      <ul class="plain-list">
        {% for r in site.data.service.reviewer %}
        <li><span class="venue-badge">{{ r.venue }}</span> {{ r.detail }}</li>
        {% endfor %}
      </ul>
    </article>
  </div>
</section>

<section class="section">
  <div class="section-head"><h2>Leadership</h2></div>
  <div class="card-list">
    <article class="card">
      <h3>Internship &amp; Placement Coordinator</h3>
      <p class="card-meta"><a href="https://ocs.iith.ac.in/" target="_blank" rel="noopener">Office of Career Services</a>, IIT Hyderabad</p>
      <p>Coordinated campus hiring end to end between companies and students, running recruitment drives and helping peers secure industry opportunities.</p>
    </article>
  </div>
</section>
