# 🛒 Voice Command Shopping Assistant

A simple voice-based shopping list app built with plain HTML/CSS/JS. No build tools,
no frameworks — just the browser's built-in Web Speech API, kept small on purpose
since this was a timeboxed assignment.

## How to run it
Just open `index.html` in Chrome (voice recognition works best there). No install,
no server needed. If you want to host it, any static host works — GitHub Pages,
Firebase Hosting, Netlify, etc. all just serve these 3 files.

## Features implemented
- **Voice input**: tap the mic and speak commands like "Add milk", "I need 2 apples",
  "Remove bread", "Find toothpaste under $5".
- **Basic NLP**: regex/keyword based parsing to handle a few different phrasings for
  add/remove/search instead of one rigid command format.
- **Multilingual**: language dropdown switches the recognition language (English,
  Hindi, Spanish, French).
- **Smart suggestions**: a small "you might need" + seasonal item chip row, tap to
  add instantly.
- **Substitutes**: when you add a known item, it suggests an alternative in case it's
  out of stock (e.g. milk -> almond milk).
- **Categorization**: items auto-sort into categories (Dairy, Produce, Snacks, etc.)
  using a lookup table.
- **Quantity handling**: numbers in the sentence are picked up ("add 2 bottles of water").
- **Search + price filter**: typed or voice search, with a basic "under $X" filter.
- **Text fallback**: in case mic access isn't available, there's a plain text input
  that runs through the same command parser.
- **UX bits**: loading/listening state on the mic button, live "heard you say" feedback,
  empty state message, basic error handling if speech recognition fails or isn't supported.

## My approach (~180 words)
I kept this deliberately simple — a single-page vanilla JS app instead of pulling in a
framework, since the core requirement is voice command handling, not architecture.
The Web Speech API handles capturing speech and turning it into text; from there I run
the transcript through a small rule-based parser that looks for keywords like "add",
"remove", "find" and pulls out quantity + item name from the sentence. This isn't a
real NLP model, but it covers the flexible phrasing the brief asked for (e.g. "I need
apples" vs "add apples") well enough for a demo.

Items are matched against a small hardcoded catalog for category + substitute info,
falling back to "Other" for anything unrecognized. Suggestions combine a couple of
"staple" items with a seasonal list picked off the current month, just to make it feel
a bit smarter without needing real purchase history.

I skipped a backend entirely — everything lives in memory in the browser, which keeps
setup at zero and matches the "max 8 hours" scope. A text input is included as a
fallback since speech recognition isn't supported everywhere.

## Possible next steps (if I had more time)
- Persist the list (localStorage or a real backend)
- Real product/price data instead of a hardcoded catalog
- A proper NLP intent classifier instead of keyword matching
