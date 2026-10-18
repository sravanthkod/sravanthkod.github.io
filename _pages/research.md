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
  </div>

  <div class="pub-list" id="pub-list">
    {% for pub in site.data.publications %}
      {% include publication.html pub=pub %}
    {% endfor %}
  </div>
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
