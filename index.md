---
layout: default
title: null
description: "Sravanth Kodavanti — Research Engineer at Nava working on AI model inference optimization on GPUs, and MS CS student at Georgia Tech. Previously at Samsung Research (NAS, quantization, pruning for edge AI)."
keywords: "Sravanth Kodavanti, Research Engineer, Nava, Georgia Tech, AI Inference Optimization, GPU Inference, Model Optimization, Quantization, Edge AI, Samsung Research"
image: /assets/sravanth_profile_3.jpeg
news_visible: 5
---
{% include JB/setup %}

<div class="container home">

  <!-- ===================== HERO ===================== -->
  <section class="hero" id="hero">
    <div class="hero-text">
      <p class="hero-eyebrow">Research Engineer</p>
      <h1 class="hero-name">Sravanth Kodavanti</h1>
      <p class="hero-role">
        Research Engineer at <a href="https://nava.com/" target="_blank" rel="noopener">Nava</a>
        <span class="sep">·</span>
        MS CS <span class="muted">(Computational Perception &amp; Robotics)</span> at
        <a href="https://www.gatech.edu/" target="_blank" rel="noopener">Georgia Tech</a>
      </p>

      <p class="hero-bio">
        I make AI models run <strong>fast and efficiently on GPUs</strong>. At Nava I work on
        inference optimization for large models; before that I spent two years at
        <a href="https://research.samsung.com/sri-b" target="_blank" rel="noopener">Samsung Research</a>
        compressing LLMs, diffusion and image-restoration models for on-device deployment through
        <em>neural architecture search, quantization, pruning and distillation</em>. My work spans
        both the <a href="{{ site.baseurl }}/research/">vision and language</a> domains, with
        <strong>10+ papers</strong> at venues like CVPR, ACL and ICASSP and two patents filed.
      </p>

      {% include social-links.html %}
    </div>

    <div class="hero-photo">
      <img src="{{ site.baseurl }}/assets/sravanth_profile_3.jpeg" alt="Sravanth Kodavanti" width="320" height="320">
    </div>
  </section>

  <!-- ===================== NEWS ===================== -->
  <section class="section" id="news">
    <div class="section-head">
      <h2>News</h2>
    </div>
    <ul class="news-list">
      {% for item in site.data.news %}
      <li class="news-item{% if forloop.index > page.news_visible %} news-extra is-hidden{% endif %}">
        <span class="news-date">{{ item.date | date: "%b %Y" }}</span>
        <span class="news-text">{{ item.text }}</span>
      </li>
      {% endfor %}
    </ul>
    {% if site.data.news.size > page.news_visible %}
    <button type="button" class="show-more" id="news-more" aria-expanded="false">Show all news</button>
    {% endif %}
  </section>

  <!-- ===================== SELECTED RESEARCH ===================== -->
  <section class="section" id="selected">
    <div class="section-head">
      <h2>Selected research</h2>
      <a class="section-link" href="{{ site.baseurl }}/research/">All publications &rarr;</a>
    </div>
    <div class="pub-list">
      {% for pub in site.data.publications %}
        {% if pub.selected %}{% include publication.html pub=pub compact=true %}{% endif %}
      {% endfor %}
    </div>
  </section>

  <!-- ===================== EXPERIENCE + EDUCATION ===================== -->
  <div class="two-col">
    <section class="section" id="experience">
      <div class="section-head"><h2>Experience</h2></div>
      <ul class="timeline">
        {% for job in site.data.cv.experience %}
        <li class="timeline-item{% if job.current %} is-current{% endif %}">
          <div class="timeline-head">
            <span class="timeline-role">{{ job.role }}</span>
            <span class="timeline-dates">{{ job.dates }}</span>
          </div>
          <div class="timeline-org">
            {% if job.url %}<a href="{{ job.url }}" target="_blank" rel="noopener">{{ job.org }}</a>{% else %}{{ job.org }}{% endif %}
          </div>
          {% if job.summary %}<p class="timeline-summary">{{ job.summary }}</p>{% endif %}
        </li>
        {% endfor %}
      </ul>
    </section>

    <section class="section" id="education">
      <div class="section-head"><h2>Education</h2></div>
      <ul class="timeline">
        {% for ed in site.data.cv.education %}
        <li class="timeline-item{% if ed.current %} is-current{% endif %}">
          <div class="timeline-head">
            <span class="timeline-role">{{ ed.role }}</span>
            <span class="timeline-dates">{{ ed.dates }}</span>
          </div>
          <div class="timeline-org">
            {% if ed.url %}<a href="{{ ed.url }}" target="_blank" rel="noopener">{{ ed.org }}</a>{% else %}{{ ed.org }}{% endif %}
          </div>
          {% if ed.detail %}<p class="timeline-summary">{{ ed.detail }}</p>{% endif %}
        </li>
        {% endfor %}
      </ul>
    </section>
  </div>

</div>

<script>
  (function () {
    var btn = document.getElementById('news-more');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.news-extra').forEach(function (el) {
        el.classList.toggle('is-hidden', open);
      });
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      btn.textContent = open ? 'Show all news' : 'Show less';
    });
  })();
</script>
