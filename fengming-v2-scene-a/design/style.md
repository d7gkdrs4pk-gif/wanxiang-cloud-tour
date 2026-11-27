# Fengming Gate — H33 visual direction

Locked direction: A tactile matte Chinese mountain-gate diorama, with broad hand-painted material values and restrained surface grain. Keep the welcoming pine's leaning trunk, first fork, substantial lateral branch and separated foliage tiers readable in the ordinary phone-sized gameplay view; keep the swordsman's tied hair, compact male silhouette, red robe, cream collar and physical sword distinct from the background. Use a low-contrast blue-grey, ink-green and weathered stone environment, medium-value architectural and pine obstacles, and a higher-contrast vermilion-and-cream hero; reserve small aged-gold accents for the sword guard and quiet architectural details. Ordinary sword motion is a short silver-cream trace subordinate to the actual arm and blade, while the scarlet-phoenix ability may be larger and brighter. Match every painted, baked and runtime-lit asset to the same warm key light at world (-8, 16, 12), cool restrained fill and grounded contact shadows. Preserve the existing perspective camera at FOV 39 degrees with follow offset (6, 27, 15), original hero scale and original playable terrain; judge cohesion at 390×844 before inspecting close-ups.

## Application

- Treat this paragraph as the common art direction for character, enemy, pine, stone, roof, lighting and effects work. A model's provenance or material complexity does not establish visual quality.
- Keep the environment quieter than the hero. Tree-canopy and roof highlights must not merge into a single silhouette or hide the hand-to-sword connection.
- Use material roughness, broad light and contact value to establish volume. Avoid covering an unreadable body or attack with bright effects.
- Retain real world placement, ground height, collision and depth ordering. Judge moving through the branch and climbing the existing side stairs in the normal camera.
- Preserve H32's classic local bundle, launcher error handling, retry path and first-frame completion behavior. Art changes must not return the entry to a permanent loading screen.
- Compare H33 through its explicit versioned entry. The preserved `h31-compare.html` is the H31 baseline; adding an old version query to the current sample entry does not restore old assets.

## Acceptance images

Use full 390×844 frames at the normal camera and native input, followed by optional analysis crops. Require a normal-UI traversal recording and a separate no-FX ordinary attack sequence. Pair any HUD-hidden diagnostic with its normal-UI frame and identify it as diagnostic. Bone counts, flags, damage events and draw-call numbers support the observation; they do not substitute for a readable swordsman, traversable scene or visible blade contact.

Reference methods and license boundaries: [SAMPLE_H33_SOURCES.md](../project/SAMPLE_H33_SOURCES.md). This is the art target; final visual approval requires the actual H33 captures.
