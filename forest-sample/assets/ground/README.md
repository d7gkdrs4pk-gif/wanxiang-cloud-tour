# Original forest ground

Runtime: `forest-ground.webp`. Native art:1254×1254, preserved without resampling. Render across a1536×1536 world. WebP is lossless and its decoded RGB pixels exactly match `forest-ground-source.png`.

The original ImageGen terrain has a quiet central clearing, a natural stone path bending from bottom-centre through centre-left to upper-centre, edge-only low plants/stone ledges and a shallow stream in the far upper-right. No complete trees, crowns, characters, buildings or UI are baked into the ground.

`ground-layout.json` gives world-coordinate spawn, safe centre, optional walkable polygon, path centreline and corner-water exclusion suggestions. These describe the art and do not implement game collision. Put large trees and foreground cover in separate sprite layers.

`provenance.json` records direct project ImageGen authorship, actual dimensions, hashes and conversion. `generation-prompt.txt` preserves the production brief. No existing game texture or reference screenshot was copied.
