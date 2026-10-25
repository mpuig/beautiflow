# Pele architecture geometry extension

`index.js` is a generated, self-contained bundle of Pele 1.10.0's architecture diagram module from commit `4eff76f98c73b6817800a05773517f35832e4e92`. See `LICENSE` for MIT attribution. All other Pele families come from the exact npm dependency.

The extension is additive: the renderer returns `geometry` alongside its unchanged SVG, dimensions, and links. It exposes service/junction boxes, estimated service-label boxes, actual port anchors (including group traversals and label-aware bottom ports), untrimmed/unrounded route points, actual group-title footprints, and the SVG body's translation. The coordinates share one local coordinate system; `offset` maps it to the SVG viewport.

It does not reroute edges, change placement, scrape SVG, or invent pixel coordinates. Arrow trimming, corner rounding, edge-label boxes, browser glyph measurements, and provider semantics are outside this geometry audit. Node and label bounds are the engine's layout estimates, not measured browser ink.

## Reproduce

Clone https://github.com/obsidianmd/pele and check out the exact commit above. Then, from the Beautiflow root:

```sh
bun scripts/vendor-pele-architecture.ts /path/to/pele
```

The generator copies the source to a temporary directory, applies uniquely matched additions, and bundles the architecture module. It never modifies the supplied checkout. Normal builds need no checkout or network access. Keep the generated bundle, generator, declaration, attribution, and tests together when upgrading.

`test/architecture-agent.test.ts` checks byte-for-byte parity with the unmodified upstream renderer and exercises the geometry evidence. Existing architecture fixtures also remain byte-exact. This is a local extension suitable for an upstream proposal, not an API claimed to have been merged or released by Pele.
