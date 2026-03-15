# Knowledge Sources

This project does not rely on a single prompt. It uses multiple public-source layers and ranks them per question.

## Main Layers

- `data/jahongir-business-knowledge.json`
  - official organization facts and operating details
  - primary targets: Cambridge Learning Center, Jahon School, Modme

- `data/jahongir-telegram-knowledge.json`
  - public Telegram post extraction from `@jakhongir_pulatov_blog`

- `data/jahongir-public-snippets.json`
  - curated public snippets from official pages, interviews, podcast pages, LinkedIn posts, app listings, and public business pages

- `data/jahongir-longform-content.json`
  - longform interview and podcast cues

- `data/jahongir-transcript-snippets.json`
  - local transcript excerpts from approved public media files

- `data/jahongir-youtube-transcript-snippets.json`
  - locally transcribed YouTube snippets and highlights

- `data/jahongir-voice-set.json`
  - higher-priority tone anchors and answer framing

## High-Signal Official Sources

- Cambridge Learning Center
  - `https://cambridgeonline.uz/`
  - `https://cambridgeonline.uz/en/`
  - `https://cambridgeonline.uz/en/landing`
  - `https://cambridgeonline.uz/faq`
  - `https://cambridgeonline.uz/cambridge-app/`
  - `https://cambridgeonline.uz/success/`

- Jahon School
  - `https://jahonschool.uz/`
  - `https://jahonschool.uz/aboutus`
  - `https://jahonschool.uz/aboutus/dark`
  - `https://jahonschool.uz/admissions`
  - `https://jahonschool.uz/faqs`

- Modme
  - `https://modme.uz/`
  - `https://modme.uz/about/`
  - `https://modme.uz/prices/`
  - `https://modme.uz/gamification/`
  - `https://modme.uz/support/`
  - `https://modme.uz/vacancies/`
  - `https://modme.uz/resources/oferta/`

## Public Ecosystem / Secondary Sources

- Jahongir Telegram blog
  - `https://t.me/s/jakhongir_pulatov_blog`

- Cambridge LC Telegram
  - `https://t.me/s/cambridge_learning_center`

- Jahon School Telegram
  - `https://t.me/s/jahon_school`

- App Store developer/account signals
  - `https://apps.apple.com/cr/developer/jakhongir-pulatov/id1657827937`
  - `https://apps.apple.com/cr/app/cambridge-student-app/id6444906132`
  - `https://apps.apple.com/cr/app/js-oquvchi/id6748948691`

- Public business and media pages
  - `https://app.dealroom.co/companies/modme`
  - `https://www.spot.uz/oz/2023/11/30/books/`
  - `https://yoshlarkelajagimiz.uz/jahongir-pulatov-tizim-yoqligi-qimmatga-tushgan/`
  - `https://rss.com/podcasts/osmondagi-bolalar/2474510/`
  - `https://rss.com/podcasts/gashtak/1687885/`

## Retrieval Rules

- official entity facts outrank secondary content
- curated voice-set anchors outrank generic snippets
- theme-summary and ecosystem questions use aggregate sources
- broad sources are filtered out for narrow entity questions
- time-sensitive answers are instructed to use dated public signals

## Limits

- not every public claim is equally reliable
- some sources are secondary and should be treated cautiously
- some media content is platform-blocked, incomplete, or transcript-noisy
- the app is grounded in public data, not private or insider information
