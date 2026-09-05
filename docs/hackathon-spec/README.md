# Hackathon specifications

Everything the organisers gave us, plus faithful extractions of it.

| File | What it is |
| --- | --- |
| [challenge-brief.md](challenge-brief.md) | Full extraction of the Topic Challenge deck: objectives, both tracks, guidelines, team structure, submission requirements, judging rubric |
| [source-pdfs/](source-pdfs/) | Original PDFs as supplied |

## Adding more organiser material

Drop new PDFs into `source-pdfs/` and ask for an extraction. Extractions live in this folder as separate `.md` files, one per source document, and stay faithful to the source: no interpretation, no scoping decisions. Our own thinking belongs in `../product/` and `../technical/`.

Text extracts with `pdftotext -layout`, but note that these decks are made in Canva and a lot of the substance is baked into graphics, so pages also need rendering (`pdftoppm -png -r 100`) and reading visually. The challenge-areas and example-solution rows on the track slides were invisible to text extraction.
