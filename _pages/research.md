---
layout: page
title: Research
subtitle: "Training- and inference-time efficiency for vision and language models — from GPU-scale inference to on-device compression."
permalink: /research/
description: "Publications, patents and thesis of Sravanth Kodavanti — efficient AI for vision and language: NAS, quantization, pruning, distillation, and GPU inference optimization."
keywords: "Sravanth Kodavanti publications, efficient AI, model compression, quantization, pruning, NAS, diffusion, LLM inference"
order: 2
---

<p class="lede">
  I work on making models cheaper to train and serve without giving up quality —
  currently <strong>inference optimization on GPUs</strong> at Nava, and previously
  <strong>on-device compression</strong> at Samsung Research. Below are my
  publications, patents and thesis.
  <a href="https://scholar.google.com/citations?user=SiOQawIAAAAJ&amp;hl=en" target="_blank" rel="noopener">Google&nbsp;Scholar&nbsp;&rarr;</a>
</p>

<!-- ---------- Publications ---------- -->
<section class="section" id="publications">
  <div class="section-head">
    <h2>Publications</h2>
    <div class="filterbar" role="group" aria-label="Filter publications">
      <button type="button" class="filter is-active" data-filter="all">All</button>
      <button type="button" class="filter" data-filter="vision">Vision</button>
      <button type="button" class="filter" data-filter="language">Language</button>
      <button type="button" class="filter" data-filter="first">First-author</button>
    </div>
  </div>

  <div class="pub-list" id="pub-list">
    {% for pub in site.data.publications %}
      {% include publication.html pub=pub %}
    {% endfor %}
  </div>
  <p class="filter-empty is-hidden" id="filter-empty">No publications match this filter.</p>
</section>

<!-- ---------- Patents ---------- -->
<section class="section" id="patents">
  <div class="section-head"><h2>Patents</h2></div>
  <div class="card-list">
    <article class="card">
      <h3>Multi-objective Optimization for Balanced Inference-time Latency-efficient and Eviction-aware SWA (Mobile SWA)</h3>
      <p class="card-meta"><strong class="me">Sravanth Kodavanti</strong>, Srinivas Miriyala, Sowmya Vajrala, Nikita Malik, Vikram N R</p>
      <p class="card-status">Provisional specification filed</p>
      <p>A dynamic sliding window for token-eviction that shrinks the KV cache of LLMs with negligible accuracy loss.</p>
    </article>
    <article class="card">
      <h3>System and Method for Accelerating On-Device Large Language Model Inference</h3>
      <p class="card-meta"><strong class="me">Sravanth Kodavanti</strong>, Srinivas Miriyala, Sowmya Vajrala</p>
      <p class="card-status">Complete specification filed</p>
      <p>A self-speculative decoding technique that improves throughput and reduces latency for on-device LLM inference.</p>
    </article>
  </div>
</section>

<!-- ---------- Thesis ---------- -->
<section class="section" id="thesis">
  <div class="section-head"><h2>Thesis</h2></div>
  <div class="card-list">
    <article class="card">
      <h3><a href="{{ site.baseurl }}/assets/Continual_Learning_UnderGrad.pdf" target="_blank" rel="noopener">Continual Learning for 3D Point Clouds</a></h3>
      <p class="card-meta">Bachelor's thesis, IIT Hyderabad (2023–2024) · advised by <a href="https://sites.google.com/site/pksrijith/home" target="_blank" rel="noopener">Dr. P K Srijith</a></p>
      <div class="pub-links"><a class="chip" href="{{ site.baseurl }}/assets/Continual_Learning_UnderGrad.pdf" target="_blank" rel="noopener">Poster</a></div>
    </article>
  </div>
</section>

<script>
  (function () {
    var bar = document.querySelector('.filterbar');
    if (!bar) return;
    var pubs = Array.prototype.slice.call(document.querySelectorAll('#pub-list .pub'));
    var empty = document.getElementById('filter-empty');

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (!btn) return;
      var f = btn.getAttribute('data-filter');
      bar.querySelectorAll('.filter').forEach(function (b) { b.classList.toggle('is-active', b === btn); });

      var shown = 0;
      pubs.forEach(function (p) {
        var match = f === 'all'
          || (f === 'first' && p.getAttribute('data-first') === 'true')
          || p.getAttribute('data-topic') === f;
        p.classList.toggle('is-hidden', !match);
        if (match) shown++;
      });
      if (empty) empty.classList.toggle('is-hidden', shown !== 0);
    });
  })();
</script>
