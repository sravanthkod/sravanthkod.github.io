---
layout: page
title: Binge
permalink: /binge/
order: 8
description: "Films and series I've been watching — synced from Letterboxd, tracked with Serializd."
---

{% assign has_series = false %}
{% if site.data.series.shows %}
{% if site.data.series.shows.size > 0 %}
{% assign has_series = true %}
{% endif %}
{% endif %}

<div class="binge-container">
  <p class="binge-intro">
    Films I've been watching — synced from my
    <a href="{{ site.data.letterboxd.profile_url }}" target="_blank" rel="noopener">Letterboxd diary</a>,
    newest first{% if has_series %}; series tracked on
    <a href="https://www.serializd.com/user/{{ site.data.series.username | default: 'sravanthkod' }}/" target="_blank" rel="noopener">Serializd</a>{% endif %}.
  </p>

  {% if has_series %}
  <div class="binge-tabs" role="tablist" aria-label="Watch sections">
    <input type="radio" name="binge-tab" id="binge-tab-films" checked>
    <label for="binge-tab-films">Films</label>
    <input type="radio" name="binge-tab" id="binge-tab-series">
    <label for="binge-tab-series">Series</label>
  </div>
  {% endif %}

  <div {% if has_series %}class="binge-panel binge-panel-films"{% endif %}>
  {% assign months = site.data.letterboxd.films | group_by: "month" %}
  {% for m in months %}
  <section class="journal-month">
    <header class="journal-header">
      <span class="journal-title">{{ m.name }}</span>
      <span class="journal-leader" aria-hidden="true"></span>
      <span class="journal-count">{{ m.size }} {% if m.size == 1 %}film{% else %}films{% endif %}</span>
    </header>
    <div class="binge-grid">
    {% for film in m.items %}
    {% assign full = film.rating | floor %}
    {% assign rem = film.rating | minus: full %}
    {% assign half_slot = full | plus: 1 %}
    <a class="film-card" href="{{ film.url }}" target="_blank" rel="noopener">
      <div class="film-poster">
        {% if film.poster %}
        <img src="{{ film.poster | prepend: site.baseurl }}" loading="lazy" alt="{{ film.title | escape }} poster" width="600" height="900">
        {% endif %}
        {% if film.rewatch %}<span class="film-rewatch">rewatched</span>{% endif %}
        {% if film.review != "" %}<span class="film-has-review" title="reviewed">&#10078;</span>{% endif %}
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
        {% if film.watched %}<span class="film-date">{{ film.watched | date: "%-d %b" }}</span>{% endif %}
      </div>
    </a>
    {% endfor %}
    </div>
  </section>
  {% endfor %}
  </div>

  {% if has_series %}
  <section class="journal-month binge-panel binge-panel-series">
    <header class="journal-header">
      <span class="journal-title">Series</span>
      <span class="journal-leader" aria-hidden="true"></span>
      <span class="journal-count">{{ site.data.series.shows.size }} {% if site.data.series.shows.size == 1 %}show{% else %}shows{% endif %}</span>
    </header>
    <div class="binge-grid">
    {% for show in site.data.series.shows %}
    {% if show.rating %}
    {% assign sfull = show.rating | floor %}
    {% assign srem = show.rating | minus: sfull %}
    {% assign shalf_slot = sfull | plus: 1 %}
    {% endif %}
    {% if show.url %}<a class="film-card" href="{{ show.url }}" target="_blank" rel="noopener">{% else %}<div class="film-card">{% endif %}
      <div class="film-poster">
        {% if show.poster %}
        <img src="{{ show.poster | prepend: site.baseurl }}" loading="lazy" alt="{{ show.title | escape }} poster" width="600" height="900">
        {% endif %}
      </div>
      <div class="film-meta">
        <span class="film-title">{{ show.title | escape }}{% if show.year %} <span class="film-year">{{ show.year }}</span>{% endif %}</span>
        {% if show.rating %}
        <span class="film-stars" aria-label="{{ show.rating }} out of 5">
          {% for n in (1..5) %}
          {% if n <= sfull %}<span class="on">★</span>
          {% elsif n == shalf_slot and srem >= 0.5 %}<span class="half">★</span>
          {% else %}<span class="off">★</span>
          {% endif %}
          {% endfor %}
        </span>
        {% endif %}
      </div>
    {% if show.url %}</a>{% else %}</div>{% endif %}
    {% endfor %}
    </div>
  </section>
  {% endif %}

  <p class="binge-synced">
    {{ site.data.letterboxd.film_count }} films{% if has_series %} · {{ site.data.series.shows.size }} series{% endif %} ·
    last synced {{ site.data.letterboxd.fetched_at }} ·
    <a href="{{ site.data.letterboxd.profile_url }}" target="_blank" rel="noopener">follow me on Letterboxd</a>
  </p>
</div>
