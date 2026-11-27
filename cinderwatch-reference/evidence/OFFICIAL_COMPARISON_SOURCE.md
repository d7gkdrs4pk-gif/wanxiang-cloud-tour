# Official source comparison

Left panel is frame0 decoded from the author’s official `media/gameplay-20s.mp4` at Cinderwatch commit `8313bb2f3eace68f8eb3c1e3c53ffa7e4663dcd5`. Source: https://github.com/kevintngo/cinderwatch/tree/8313bb2 . License: https://github.com/kevintngo/cinderwatch/blob/8313bb2/LICENSE — MIT, Copyright (c)2026 kevintngo. Preserve the MIT license notice when republishing the source package.

Right panel is the local playable original-source replica, seed4, fixed1/60 simulation frame5131,1920×1080 browser PNG. The images are placed side by side without retouching, camera changes or warping. Original panels retain1920×1080 pixels; the contact sheet only adds a separate title/footer.

This comparison uses **only the official repository video**. No private user-uploaded video or frame is used in the delivered comparison files.

Raw1920×1080 RGB SSIM:0.880118. Scene ROI (excluding top HUD and bottom sound-button region):0.880948. Equally resized640×360 preview SSIM:0.970346. These are distinct metrics and should be labeled when cited. The visible geometry, framing and initial HUD state match; video compression/noise/dither and the local sound-button prompt remain different. Exact pixels and real-time FPS are not claimed. Full metrics and provenance are in `official-comparison.json`.
