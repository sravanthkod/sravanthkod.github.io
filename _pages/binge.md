---
layout: page
title: Binge
permalink: /binge/
order: 8
description: "Films I've been watching — synced from my Letterboxd diary, newest first."
---

<div class="binge-container">
  <p class="binge-intro">
    Films I've been watching — synced from my
    <a href="{{ site.data.letterboxd.profile_url }}" target="_blank" rel="noopener">Letterboxd diary</a>,
    newest first.
  </p>

  <div class="binge-grid">
    {% for film in site.data.letterboxd.films %}
    {% assign full = film.rating | floor %}
    {% assign rem = film.rating | minus: full %}
    {% assign half_slot = full | plus: 1 %}
    <a class="film-card" href="{{ film.url }}" target="_blank" rel="noopener">
      <div class="film-poster">
        {% if film.poster %}
        <img src="{{ film.poster | prepend: site.baseurl }}" loading="lazy" alt="{{ film.title | escape }} poster" width="600" height="900">
        {% endif %}
        {% if film.rewatch %}<span class="film-rewatch">rewatched</span>{% endif %}
        {% if film.review != "" %}<div class="film-review"><p>{{ film.review | escape }}</p></div>{% endif %}
      </div>
      <div class="film-meta">
        <span class="film-title">{{ film.title | escape }} <span class="film-year">{{ film.year }}</span></span>
        <span class="film-stars" aria-label="{{ film.rating }} out of 5">
          {% for n in (1..5) %}
          {% if n <= full %}<span class="on">★</span>
          {% elsif n == half_slot and rem >= 0.5 %}<span class="half">★</span>
          {% else %}<span class="off">★</span>
          {% endif %}
          {% endfor %}
          {% if film.like %}<span class="film-heart" title="liked">♥</span>{% endif %}
        </span>
      </div>
    </a>
    {% endfor %}
  </div>

  <p class="binge-synced">
    {{ site.data.letterboxd.film_count }} films · last synced {{ site.data.letterboxd.fetched_at }} ·
    <a href="{{ site.data.letterboxd.profile_url }}" target="_blank" rel="noopener">follow me on Letterboxd</a>
  </p>
</div>
