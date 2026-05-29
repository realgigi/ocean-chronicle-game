# 06 Art Style Guide — 《海洋戰紀》Game

## Core style

- Q版 3D 日式動畫風
- Underwater fantasy world
- Cinematic but cute
- High contrast blue / purple / gold lighting
- Detailed characters, readable silhouettes
- UI should feel ornate but not cluttered

## Color language

### Heroic / ancient / divine
- Gold
- Ice blue
- Pearl white
- Clean cyan
- Soft glowing particles

### Black tide / corruption / abyssal weapons
- Purple-black
- Deep blue
- Toxic violet
- Biohazard purple
- Iridescent trash-glass highlights

### Coral old street
- Coral red
- Warm orange lanterns
- Teal water shadows
- Daily life atmosphere

### Northern border
- Cold blue
- Dark stone
- Gold highlights from雙帶武士
- Purple cracks from corruption

### Dark-current area
- Dark blue
- Purple water-flow trails
- Low light
- Ruin silhouettes

### Ice field / Snow seal line
- Ice blue
- White glow
- Crystal fragments
- Soft mystical fog

### Abyssal factory / deep weapons
- Purple toxic tanks
- Industrial metal
- Pipes and chains
- Biohazard motifs
- Dark eel strategist lighting

## Character rendering rules

### General
- Characters must remain chibi.
- Heads and eyes are relatively large.
- Body proportions are compact.
- Expressions should be clear.
- Armor and costume detail can be rich, but silhouette must be readable.

### 雙帶武士
Must have:

- Yellow fish face/body
- Black-gold samurai armor
- Gold helmet crest
- Serious eyes
- Sword

Avoid:

- Making him orange like公子王子
- Removing samurai armor
- Giving him guns

### 銀背突擊兵
Must have:

- Orange fish body
- Transparent / silvery armor
- Futuristic helmet and front goggles
- Rifle
- Stern expression

Avoid:

- Generic soldier design
- Heavy dark armor that hides orange fish identity
- Wrong weapon type

### 雪印法師
Must have:

- Ice crown / ice armor
- Staff or ice crystal orb
- Orange-white clownfish identity
- Calm mage presence

### 黑豹忍者
Must have:

- Black stealth outfit
- Masked face
- White markings
- Twin blades / stealth gear

### 透紅浪人
Must have:

- Red ronin outfit
- Sword
- Serious, restrained expression

### 鯙鰻軍師
Must have:

- Spotted eel/moray body
- Long coiled body
- Dark ornate robe
- Gold chains and jewelry
- Sinister strategist mood

### 六齒魨工程師
Must have:

- Yellow-black pufferfish body
- Engineer helmet
- Tool belt
- Industrial / hazard symbols
- Excited villain-engineer expression

### 垃圾海葵群
Must have:

- Translucent blue/turquoise tissue
- Plastic bottles, nets, debris
- Bubble-like eyes
- Invasive growth behavior

### 巨大垃圾海葵・紫色觸手模式
Must have:

- Boss scale
- Long purple translucent tentacles
- Trash/debris embedded in tissue
- Multiple glossy eyes
- Purple pollution core
- Dangerous but still stylized

### 病毒紫海膽
Must have:

- Purple sea-urchin shape
- Spikes
- Biohazard tubes/canisters
- Toxic/bioweapon feeling

## UI style

Recommended UI:

- Ornate underwater fantasy frames
- Gold / pearl trim
- Dark blue panels
- Purple corruption accents for danger
- Chinese typography should be large and readable
- Avoid overdecorating small buttons

## Pickup style

### 海光能量

This is the current upgrade pickup for team LV1-LV5.

Visual direction:

- Small glowing ocean-light orb, pearl, or luminous plankton cluster.
- Cyan-white core with gold rim or sparkle.
- Must be readable over blue and purple backgrounds.
- Should feel collectible and valuable, not like enemy bullets.

Avoid:

- Same color and shape as enemy projectiles.
- Excessive detail that disappears at phone size.
- Text inside the pickup.

## Poster vs game-screen translation
Posters are dense and cinematic. Game screens need less clutter.

For gameplay:

- Simplify background detail.
- Keep enemies readable.
- Use clear hit flashes.
- Keep UI at safe margins.
- Avoid placing important text on busy backgrounds.

## Animation feel

Heroes:

- Snappy but weighty
- Clear anticipation before attacks
- Heroic gold / ice / blue effects

Anemones:

- Creeping, expanding, pulsing
- Tentacles should telegraph attacks before striking

Purple urchins:

- Mechanical-biological motion
- Toxic pulses, spike flashes, rotational movement

Boss:

- Slow heavy body
- Fast tentacle attacks
- Core exposed windows

## Audio style

Use the main music from the provided story videos as the first source for BGM.

Direction:

- Video segment music should introduce the mood of the stage.
- Gameplay BGM should either continue that musical identity or use a loop derived from the same track.
- Boss phases can add stingers, impacts, or low-frequency pulses over the same base music.
- Freeze-frame cut-ins should briefly duck the BGM and play a strong hit / shimmer / warning sound.

Rights:

- Only use video music that is owned, commissioned, licensed, or otherwise cleared for web game use.
- If rights are uncertain, mark the track as `rights pending` in the asset manifest.

## Freeze-frame cut-in art

Major player specials and Boss signature attacks should use static cut-in art instead of requiring full animation.

Purpose:

- Create a strong dramatic moment.
- Reduce animation workload.
- Show character personality and IP art clearly.
- Give Boss attacks a fair warning moment.

Player cut-ins:

- Show the active character in a dynamic close-up or half-body pose.
- Use the character's signature color and elemental effect.
- Include enough empty space for the skill name overlay if the UI needs it.
- Do not rely on small details; the image must read instantly on a phone screen.

Boss cut-ins:

- Show the Boss or key body part in a threatening close-up.
- Make the incoming attack type visually obvious: core glow, tentacle sweep, toxic pulse, etc.
- Keep the Boss large and readable.
- Must feel like warning and spectacle, not a surprise attack.

Recommended cut-in aspect:

- 9:16 full-screen cut-in for major story specials.
- 16:9 or 4:3 horizontal panel inside the 9:16 screen for faster combat warnings.

MVP cut-ins:

- 雙帶武士: 破芯金斬
- 巨大垃圾海葵・紫色觸手模式: 紫觸橫掃
- 巨大垃圾海葵・紫色觸手模式: 毒潮聚核
