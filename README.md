<!-- ## Contributing to the Blog

Feel free to send a pull request contributing to the blogposts in my personal website. All blogposts are located in `_posts`, which are arranged according to date. Make sure you add a line in the first section specifying your name and contribution, such as [this blog](_posts/2017-05-17-applying-for-j1.markdown) file. Images are typically located in `assets`.

Here is a list of the more popular blogs -

* Graduate school application resources - [`_posts/2018-05-30-grad-resources.markdown`](_posts/2018-05-30-grad-resources.markdown)
* GRE / TOEFL preparation - [`_posts/2017-12-08-gre-toefl-preparation-2.markdown`](_posts/2017-12-08-gre-toefl-preparation-2.markdown)
* Applying for a J-1 visa - [`_posts/2017-05-17-applying-for-j1.markdown`](_posts/2017-05-17-applying-for-j1.markdown)
* Computer science opportunities in IIT Bombay - [`_posts/2018-06-05-cs-opportunities.markdown`](_posts/2018-06-05-cs-opportunities.markdown)
* How to contribute to StackOverflow - [`_posts/2016-12-22-zero-to-established.markdown`](_posts/2016-12-22-zero-to-established.markdown)
* Getting started with crowdsourcing - [`_posts/2018-06-02-crowd-sourcing.markdown`](_posts/2018-06-02-crowd-sourcing.markdown)

## Forking the Website

Feel free to fork the website. It's the default Jekyll template with minor CSS modification. However, make sure you edit the analytics ID in [`_includes/analytics.html`](_includes/analytics.html) so that your website's views are not logged into my account. -->

# Sravanth Kodavanti
**Research Engineer @ Nava · MS CS @ Georgia Tech**  
*AI Model Inference Optimization on GPUs | Ex-Samsung Research (NAS, Quantization, Pruning) | IIT Hyderabad CS '24*

![Profile](https://repository-images.githubusercontent.com/1030788758/5e3a3af9-cf58-492a-a3dd-81e426c4bd94) <!-- Replace with your photo -->

📧 [ramasravanthkodavanti@gmail.com](mailto:ramasravanthkodavanti@gmail.com)  
🌐 [Portfolio](https://sravanthkod.github.io) | [LinkedIn](https://linkedin.com/in/sravanthk27) | [Twitter](https://twitter.com/sravanthkod) | [Google Scholar](https://scholar.google.com/citations?user=SiOQawIAAAAJ&hl=en)

## Recent Highlights
| Date | Achievement |
|------|-------------|
| Oct 2026 | Joined Nava as Research Engineer (AI model inference optimization on GPUs) |
| Aug 2026 | Started MS in Computer Science at Georgia Tech |
| Aug 2026 | Paper accepted at ECCV 2026 LoViF Workshop (Oral) |
| Apr 2026 | Paper accepted at ACL 2026 Findings |
| Feb 2026 | NanoSD accepted at CVPR 2026 |

**🔬 [View Publications & Projects →](https://sravanthkod.github.io/research/)** · **📰 [News →](https://sravanthkod.github.io/#news)**

---

## Site structure

This is a Jekyll site. Content is data-driven where it repeats:

| File | Drives |
|------|--------|
| `_data/publications.yml` | Home "Selected research" + Research page (topic/first-author filters) |
| `_data/news.yml` | Home "News" timeline |
| `_data/cv.yml` | Home Experience + Education |
| `_data/service.yml` | Service page (area chair / reviewer) |
| `_data/navigation.yml` | Top navigation (the `life` group renders after a divider) |

`index.md` is the single landing page (hero + news + selected research + experience/education). `/about/` and `/updates/` are kept only as redirects to the home page. Pages use the `page` layout, which renders `title` + `subtitle` front matter as the header.

Build locally with `bundle exec jekyll serve`.

---
*Deployed with [GitHub Pages](https://pages.github.com) & [Jekyll](https://jekyllrb.com)*
