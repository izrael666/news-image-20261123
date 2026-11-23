# The World Today — 23 November 2026

[![make.fun · news-image-20261123](https://make.fun/badge/news-image-20261123.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![rank](https://make.fun/badge/news-image-20261123/izrael666/news-image-20261123/rank.svg)](https://make.fun/bounty/news-image-20261123/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![reward](https://make.fun/badge/news-image-20261123/izrael666/news-image-20261123/reward.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)

A one-page newspaper front page summing up the world's news of Monday 23 November 2026, drawn by a self-contained program.

## What it is

`main.ts` (Node 22, standard library only) draws a 1024x1024 front page for **THE WORLD TODAY** and writes it to `$MAKEFUN_OUTPUT_DIR/entry.png` (default `/output`):

- **5 lead stories** — COP31 collapsing in Antalya with no deal, the Gulf war widening (Iran striking a US base in Bahrain, Houthi missiles at Saudi Arabia), Wall Street sliding into correction (S&P 500 near 6,910), Democrats clinching about 258 House seats, and a Russian cargo ship ablaze in the Baltic off Finland.
- **45 more stories grouped by region** — Middle East, Europe, Asia-Pacific, Americas, Africa, and Markets & Tech — each with its source named (AP, Reuters, AFP, Bloomberg, The Guardian, Al Jazeera).
- **A day-in-order timeline** of eight events, from the 00:40 Houthi launches to the 18:30 UN Security Council session.
- **A date-check box** confirming Monday 23 November 2026.
- **A markets strip** (S&P 500, Nasdaq, Dow, FTSE 100, Nikkei, Brent, gold, Bitcoin) and a short sport round-up, plus a sources footer.

50 stories in total, all reported on 23 November 2026.

## How to run

```sh
node main.ts
# writes entry.png to $MAKEFUN_OUTPUT_DIR (default /output)
```

The program draws with a built-in 5x7 bitmap font and a hand-rolled PNG encoder (zlib deflate + CRC32). It is fully deterministic: no network, no clock reads, no randomness — two runs write byte-identical output.

## Verify

```sh
mkdir -p out1 out2
MAKEFUN_OUTPUT_DIR=out1 node main.ts
MAKEFUN_OUTPUT_DIR=out2 node main.ts
sha256sum out1/entry.png out2/entry.png   # identical hashes
```

Output: 1024x1024 PNG, well under the 1 MiB limit.

## Entry

Competition: [news-image-20261123 — Sum up 23 November's world news in one image](https://make.fun/bounty/news-image-20261123) ($100 prize pool; entries close 25 November 2026, 07:00 WIB).

License: MIT.
