# Pole Position - Deep Research Document

## Overview

**Pole Position** is a 1982 Formula One racing arcade game developed by **Namco** and published by **Atari** in North America. It was a landmark title -- the first racing game to feature a qualifying lap, the first to use a real-world circuit (Fuji Speedway), and one of the first arcade games to use 16-bit processors. It was the highest-grossing arcade game in Japan in 1982 and worldwide in 1983, generating approximately $60.9M from over 24,550 cabinets by 1988.

- **Release date**: September 16, 1982 (Japan)
- **Developers**: Shinichiro Okamoto (lead designer), Kazunari Sawano (co-designer, Galaxian veteran), Sho Osugi (hardware), Kouichi Tashiro (hardware)
- **Sound**: Nobuyuki Ohnogi, Yuriko Keino
- **Name**: Chosen by Toru Iwatani (creator of Pac-Man)
- **Development time**: 2-3 years

---

## 1. Controls

### Arcade Cabinet Variants

Two cabinet configurations exist:

| Feature | Upright Cabinet | Sit-Down (Cockpit) Cabinet |
|---------|----------------|---------------------------|
| Dimensions | 62x90 cm floor, 186 cm tall | 165x64 cm floor, 194 cm tall |
| Steering wheel | Yes (analog) | Yes (analog) |
| Accelerator pedal | Yes (analog) | Yes (analog) |
| Brake pedal | No | Yes (digital switch) |
| Gear shifter | High/Low (2-position) | High/Low (2-position) |
| Speakers | 2x 6"x9" oval | 4x (quadraphonic) |

### Steering Wheel

- **Input type**: Analog via 5K-ohm potentiometer
- **Rotation range**: Approximately 270 degrees
- **Processing**: Namco 53XX custom IC processes steering input with a delta accumulation system and 2x sensitivity multiplication
- **Behavior**: Proportional analog input -- the degree of wheel turn determines how sharply the car steers
- **Self-test**: Clockwise rotation increases values, counterclockwise decreases
- **Design note**: Development lead Okamoto wanted realistic feel; Namco president Nakamura found it difficult to keep the car straight, suggesting the steering was quite sensitive

### Accelerator Pedal

- **Input type**: Analog via potentiometer, read by ADC0804 analog-to-digital converter
- **Range**: 0x00 (released) to 0x90-0xA0 (fully depressed)
- **Behavior**: Partial depression = partial throttle (not just on/off)
- **Mechanism**: Spring and cable return system

### Brake Pedal (Sit-Down Cabinet Only)

- **Input type**: Digital snap-action switch (on/off, not analog)
- **Behavior**: Binary -- pressed or not pressed
- **Self-test**: Shows 0x00-0xFF range; upright cabinet always reads 0x00

### Gear Shifter

- **Positions**: Two -- Low (shifter up, displayed as "LO") and High (shifter down, displayed as "HI")
- **Input type**: Snap-action switch
- **Low gear**: Better acceleration at low speeds, but limits top speed (roughly half of max)
- **High gear**: Full top speed, slower initial acceleration
- **Shift point**: Players should shift to high gear at approximately 100-130 MPH
- **Design note**: The team had "long fights over how fast the gear-shift should be" before settling on the simple high/low system

### Speed Values

| DIP Setting | Top Speed (MPH) | Top Speed (KPH) |
|-------------|-----------------|-----------------|
| Average | 195 | 313 |
| Default | 225 | 362 |
| High | 244 | 391 |

- **Low gear** caps internal speed at roughly 144 units (~half of top speed)

---

## 2. Game Mechanics

### Qualifying Lap

Pole Position was the **first arcade game to feature a qualifying lap**.

- Player completes one lap of the Fuji Speedway circuit within a time limit
- **Timer settings** (DIP switch): 90, 100, 110, or 120 seconds (default: 90 seconds)
- Must finish qualifying in under **73 game-seconds** to qualify (at default Practice Rank C)
- Qualifying time determines starting grid position (1st through 8th) among seven AI cars

#### Qualifying Position Thresholds (Practice Rank C)

| Grid Position | Time Required | Bonus Points |
|---------------|--------------|-------------|
| 1st (Pole Position) | < 58.50s | 4,000 |
| 2nd | < 60.00s | 2,000 |
| 3rd | < 62.00s | 1,400 |
| 4th | < 64.00s | 1,000 |
| 5th | < 66.00s | 800 |
| 6th | < 68.00s | 600 |
| 7th | < 70.00s | 400 |
| 8th | < 73.00s | 200 |

- If the player fails to qualify within the time limit, the game ends

### Race Structure (Grand Prix)

- After qualifying, the player races in the **Grand Prix**
- **Number of laps** (configurable): 3, 4, 5, or 6 (default/recommended: 4)
- A countdown timer runs throughout the race
- **Lap 1** starts with **75 seconds** on the timer
- Completing each lap adds bonus time:
  - Lap 2: +51 seconds
  - Lap 3: +57 seconds
  - Lap 4: +61 seconds
  - (Total available time: ~244 seconds for Tournament settings)
- Timer resolution: **40 frames per second**
- If time expires before completing a lap, the **game ends immediately**
- Completing all laps ends the race with remaining time converted to bonus points

### Collision Mechanics

| Collision Type | Result |
|---------------|--------|
| Hit another car | Car explodes, respawn after ~2-3 seconds at zero speed |
| Hit roadside billboard/sign | Car explodes, respawn after ~2-3 seconds at zero speed |
| Drive into puddle | Brief loss of control / spin |
| Drive onto grass | Dramatic speed reduction, no destruction |
| Take curve too fast | Car slides, loses control |

- **Explosion**: Multi-frame animation plays for approximately 2-3 seconds
- **Respawn**: Car reappears in the center of the road at zero speed
- **Key design**: Crashing does NOT end the game -- only running out of time ends the game. The penalty is lost time (explosion animation + re-acceleration)

### AI Opponent Behavior

- **Seven computer-controlled cars** race alongside the player
- AI cars follow **predetermined paths** on the road
- Traffic density increases in later laps compared to the qualifying lap
- AI cars move at set speeds -- no confirmed rubber-banding in the original arcade version
- The player must weave through traffic, treating AI cars as obstacles

### Driving Off-Road

- Driving onto grass dramatically slows the car but does not destroy it
- The car can be steered back onto the road at any time
- No collision with non-billboard scenery (mountains, sky elements are background only)

---

## 3. Graphics and Visual System

### Display Specifications

- **Resolution**: 256 x 224 pixels
- **Refresh rate**: ~60 Hz (raster scan)
- **Monitor**: 19-inch color raster-scan

### Screen Layout

The screen is split into two distinct halves:

```
+---------------------------+
|                           |  Scanlines 0-127:
|    SKY / MOUNTAINS        |  Background tilemap
|    (Mt. Fuji visible)     |  (sky, mountains, scenery)
|                           |
+---------------------------+
|                           |  Scanlines 128-255:
|    ROAD / TRACK           |  Road rendering engine
|    (pseudo-3D perspective)|  (dedicated road hardware)
|                           |
+---------------------------+
    Sprites + Text overlay both halves
```

### Color System

- **128 base colors** from three 256x4 palette PROMs (one per RGB channel)
- Each color component uses **4 bits** with weighted resistor networks:
  - Resistor values: 220 ohm, 470 ohm, 1K ohm, 2.2K ohm
  - Multiplier values: 0x8F, 0x43, 0x1F, 0x0E
- **Color lookup table**: 2048 entries across five regions:
  - Alpha/text colors: 256 entries (transparent = color 0x2F)
  - Background tiles: 256 entries (top half only, scanlines 0-127)
  - Sprites: 1024 entries split between two palette banks (transparent = 0x1F)
  - Road: 1024 entries (bottom half only, scanlines 128-255)
- The **128V signal** (bit 7 of the scanline counter) switches palette banks between top and bottom screen halves

### Rendering Order (per frame)

1. **Background tilemap** (clipped to scanlines 0-127)
2. **Road** (scanlines 128-255)
3. **Sprites** (up to 64 entries, overlays both halves)
4. **Alpha/text tilemap** (full screen overlay -- scores, timer, speed)

### Background Tilemap

- **Grid**: 32x16 tiles, column-major scanning (64 columns x 16 rows)
- **Tile size**: 8x8 pixels, 2-bit color depth (4 colors per tile)
- **Supports horizontal scrolling** (parallax with road movement)
- Displays pre-drawn sky gradient, mountains, and Mt. Fuji

### Road Rendering (Pseudo-3D)

The road occupies scanlines 128-255 (bottom half) and is rendered using dedicated hardware:

#### Per-Scanline Algorithm

1. A **12-bit vertical offset** is calculated (3 nibbles + vertical scroll), shifted right 3, masked to 9 bits
2. Road memory provides a **4-bit palette base** for that scanline
3. A **10-bit horizontal scroll** value is fetched per scanline
4. Pixels processed in **8-pixel chunks** from road ROMs
5. ROM addressing: `((scanline & 0x7F) << 6) + ((xoffset & 0x1F8) >> 3)`
6. Control PROM provides 6-bit road values; two data PROMs determine pixel colors with carry propagation

#### Pseudo-3D Technique (General Principle)

The road is drawn as a series of **horizontal strips** where each strip represents a road segment at increasing distance from the camera:

- **Perspective projection**: `screen_scale = cameraDepth / z_distance`
- **Curves**: Achieved by accumulating horizontal offsets per scanline. Each segment adds a curve value to a running `dx` offset, creating smooth curve appearance
- **Hills**: Y-coordinate offsets per segment project strips higher or lower on screen
- **Vanishing point**: Sways side-to-side as the player approaches corners
- **Road markings**: Center line dashes, shoulder stripes rendered via road ROM data
- **Roadside objects**: Scale proportionally with distance using the sprite scaling hardware

### Sprite System

| Property | Small Sprites | Large Sprites |
|----------|--------------|--------------|
| Size | 16x16 pixels | 32x32 pixels |
| Color depth | 4-bit (16 colors) | 4-bit (16 colors) |

- Up to **64 sprite entries** per frame
- **Hardware sprite scaling** via dedicated scaling ROM
  - Scaling factors indexed by: `(sizey << 6) + current_y`
  - Pixel-by-pixel rendering with accumulator tracking
  - 0x40/0x20 bit thresholds determine pixel advancement for zoom
- Sprites in bottom half (sy >= 128) automatically get alternate palette bank (`color |= 0x40`)
- Color 0x1F = transparent pixel

### Specific Visual Elements

#### Roadside Billboards

Original branded billboards appearing along the track:
- **Marlboro** (later removed in some versions due to Philip Morris trademark lawsuit)
- **Pepsi**
- **Canon**
- **Champion**
- **Martini & Rossi**
- **Agip**
- **S.E.V.**

The game uses **palette trickery** to store two billboard designs in the same graphic data.

#### Player Car

- Shown from behind (rear perspective)
- Separate sprites for: straight driving, turning left, turning right
- Subtle "bounce" animation at higher speeds

#### AI Cars

- Various colored opponent cars visible from behind and at angles
- Scale with distance using hardware sprite scaling

#### Explosion

- Multi-frame animation lasting ~2-3 seconds
- Car breaks apart with large explosion effect
- Scattered debris visible

---

## 4. Sound System

### Sound Hardware

| Component | Function | Technology |
|-----------|----------|-----------|
| Namco WSG | Music/jingles | 8-voice wavetable synthesizer |
| Namco 54XX | Explosion + tire screech | Fujitsu MB8844 MCU with LFSR, 3 audio channels |
| Namco 52XX | Voice/speech synthesis | 4-bit sample playback via timer interrupt at 1.536 MHz |
| Discrete circuit | Engine sound | Analog synthesis, pitch varies with speed |
| DAC | Additional audio output | Digital-to-analog converter |

### Audio Mixing

- **4-channel mixing system**: "Tire," "Crash," "Voice," and a fourth channel
- Implemented on sheet 7B of schematics as a 4-channel digital gain/volume control

### Speaker Configuration

- **Upright cabinet**: 2x 6"x9" oval, 4-ohm, 15W speakers with two volume controls
- **Sit-down cabinet**: **Quadraphonic sound** -- four 4-ohm speakers (two under control panel, two behind seat) with four individual volume controls. Other cars' engines have stereo separation as you pass them

### Complete Sound Effect Inventory (19 sounds)

| # | Sound | Duration | Context |
|---|-------|----------|---------|
| 1 | Credit sound | 0:02 | Coin insert |
| 2 | Qualifying start fanfare | 0:06 | Beginning of qualifying lap |
| 3 | "Qualifying Start" voice | 0:03 | Speech announcement |
| 4 | Qualifying start sign | 0:02 | Visual countdown accompaniment |
| 5 | Qualifying goal music (non-pole) | 0:04 | Completing qualifying (not 1st) |
| 6 | Qualifying goal music (pole position) | 0:04 | Completing qualifying in 1st |
| 7 | "Grand Prix Start" voice | 0:04 | Speech announcement |
| 8 | Grand Prix start sign | 0:05 | Race start countdown |
| 9 | Grand Prix goal music | 0:04 | Completing the race |
| 10 | Name entry music - 1st place | 0:27 | High score entry (top position) |
| 11 | Name entry music - 2nd-6th place | 0:27 | High score entry (mid positions) |
| 12 | Name entry music - 7th-100th place | 0:38 | High score entry (lower positions) |
| 13 | Game over music | 0:10 | Game over screen |
| 14 | Extend sound | 0:03 | Time extension on lap completion |
| 15 | Puddle pass sound | 0:01 | Hitting water on track |
| 16 | Time bonus addition sound | 0:01 | Bonus points tally |
| 17 | Overtake bonus addition sound | 0:01 | Passing car bonus |
| 18 | Crash/explosion sound | 0:03 | Collision with car or billboard |
| 19 | Roadside driving sound | 0:03 | Driving on grass/shoulder |

### Continuous Sounds (During Gameplay)

- **Engine sound**: Generated by analog discrete circuit; pitch/frequency varies continuously with car speed (higher pitch = faster)
- **Tire screech**: Generated by Namco 54XX during sharp turns
- **Other cars' engines**: Audible with stereo separation as you pass them (cockpit cabinet)

### Music

- Composed by **Nobuyuki Ohnogi** and **Yuriko Keino**
- Music plays during **name entry** and **game over** sequences -- NOT during active gameplay
- Active gameplay features only engine sounds and sound effects

---

## 5. Track / Course Design

### Real-World Basis

The circuit is based on **Fuji Speedway** in Oyama, Shizuoka, Japan -- making Pole Position the **first racing game to feature a real-world circuit**.

- **Lap distance**: Approximately 4.36 km (2.709 miles)
- **Setting**: "The country around the speedway consists of green meadows, hills, and snow-capped Mt. Fuji" (from original manual)

### Course Layout

```
    START/FINISH
    ============
    |          |
    |  Long    |  1. Long starting straightaway (main straight)
    |  Straight|
    |          |
    +------>---+  2. Sharp right turn
         |
    <----+        3. Quick left turn (follows immediately)
    |
    +------>---+  4. Right turn (enters challenging section)
               |
    <----------+  5. Left hairpin (most difficult turn -- requires significant braking)
    |
    |  Long    |  6. Long gradual right curve
    |  Gradual |
    |  Right   |
    |          |
    +===START==+     (back to starting straightaway)
```

### Roadside Objects

| Object Type | Details |
|-------------|---------|
| Branded billboards | Marlboro, Pepsi, Canon, Champion, Martini & Rossi, Agip, S.E.V. |
| Road signs/posts | Placed along both sides of the track |
| Puddles/water patches | Placed on the track surface itself |
| Grass | Green areas flanking the road on both sides |
| Background scenery | Mountains, Mt. Fuji (background tilemap, not collidable) |

### Environmental Hazards

| Hazard | Effect |
|--------|--------|
| Puddles on track | Brief loss of control / spin |
| Grass (off-road) | Dramatic speed reduction, no destruction |
| Billboards | Collision = explosion + respawn |
| Other cars | Collision = explosion + respawn |

### Track Segments Detail

The track consists of alternating segments of straights and curves:

1. **Main straight**: The longest straight section, where top speed can be reached. Start/finish line is here. Grid positions visible at race start.
2. **Sharp right**: First major curve requiring throttle reduction. Billboards on both sides.
3. **Quick left**: Follows almost immediately after the right turn, creating an S-curve feel.
4. **Right turn**: Medium-speed curve leading into the most challenging section.
5. **Left hairpin**: The tightest turn on the circuit. Requires heavy braking (sit-down cabinet) or throttle release (upright). Most crashes happen here.
6. **Long gradual right**: A sweeping curve that requires sustained partial steering input, leading back to the main straight.

---

## 6. Scoring System

### Distance Score

- **50 points per 5 meters driven** (equivalent to 10 points per meter)
- One full lap: approximately **10,000 points**
- Qualifying lap: ~10,000 points
- Four race laps: ~40,000 points

### Passing Bonus

- **50 points per car passed**
- Cars must be fully overtaken to count
- Maximum theoretical passes in a perfect game: ~142 cars = **7,100 points**

### Qualifying Position Bonus

Awarded after a successful qualifying lap (see Section 2 for thresholds):

| Position | Bonus |
|----------|-------|
| 1st (Pole) | 4,000 |
| 2nd | 2,000 |
| 3rd | 1,400 |
| 4th | 1,000 |
| 5th | 800 |
| 6th | 600 |
| 7th | 400 |
| 8th | 200 |

### Time Bonus

- **200 points per second remaining** on the clock when the race ends (after completing all laps)
- Example: 31 remaining seconds = 6,200 points

### Maximum Score Breakdown (Tournament Settings)

| Component | Points |
|-----------|--------|
| Qualifying lap distance | 10,000 |
| Pole position bonus | 4,000 |
| Four race laps distance | 40,000 |
| Time remaining (31s x 200) | 6,200 |
| Cars passed (142 x 50) | 7,100 |
| Miscellaneous | 10 |
| **TOTAL** | **~67,310** |

### High Score System

- **Battery-backed NVRAM** stores high scores even after power-off (notable innovation for the time)
- Players enter initials using **steering wheel rotation** (to select letters) and **foot pedal presses** (to confirm)
- Three separate name entry music tracks depending on ranking tier

---

## 7. Technical Specifications

### Processors (3 CPUs)

| CPU | Type | Clock | Role |
|-----|------|-------|------|
| 1x Zilog Z80 | 8-bit | 3.072 MHz | Main game logic, input handling, sound driver |
| 2x Zilog Z8002 | 16-bit | 3.072 MHz each | Graphics rendering and sprite operations |

- Master clock: 24.576 MHz / 8 = 3.072 MHz
- Z8002 is the non-segmented variant of Z8000, addressing up to 64KB
- Pole Position was reportedly the **first arcade game to use 16-bit processors**

### Memory Map (Z80)

| Address Range | Function |
|---------------|----------|
| $0000-$2FFF | Program ROM |
| $3000-$37FF | Battery-backed NVRAM |
| $4000-$47FF | Sprite registers |
| $4800-$4BFF | Road memory |
| $4C00-$4FFF | Character/alpha RAM |
| $5000-$57FF | Background memory |
| $8000-$83FF | Sound memory |
| $9000-$A3FF | Custom IC interfaces |

### Custom Namco ICs

| Chip | Count | Function |
|------|-------|----------|
| Namco 02XX | x3 | Graphics shifter/mixer |
| Namco 03XX | x2 | Graphics data buffer/processor |
| Namco 04XX | x1 | Sprite address generator |
| Namco 06XX | x1 | Interface to 5xXX series |
| Namco 07XX | x1 | Clock divider |
| Namco 08XX | x2 | Bus controller |
| Namco 09XX | x1 | Address bus interface / Sprite RAM buffer |
| Namco 10XX | x4 | Z8002 bus controller |
| Namco 51XX | x1 | I/O controller (1.536 MHz) |
| Namco 52XX | x1 | Speech/voice sample player |
| Namco 53XX | x1 | Steering input processor |
| Namco 54XX | x1 | Noise/SFX generator (explosion, tire screech) |

### ROM Configuration

| ROM Region | Purpose |
|------------|---------|
| Character ROMs | 8x8 text/alpha tiles |
| Background tile ROMs | Sky, mountains, scenery tiles |
| Small sprite ROMs | 16x16 pixel sprites |
| Large sprite ROMs | 32x32 pixel sprites |
| Road control ROM (pp1_30.3a) | Road segment control data |
| Road data ROM 1 (pp1_31.2a) | Road pixel data (bits 1) |
| Road data ROM 2 (pp1_32.1a) | Road pixel data (bits 2) |
| Scaling ROM (pp1_27.1l) | Sprite scaling lookup table |
| Palette PROMs | RGB color definitions |
| Color lookup PROMs | Color index mapping |

### Interrupt System

| Interrupt | Trigger | Processor |
|-----------|---------|-----------|
| IRQ | Scanlines 64 and 192 | Z80 |
| NVI (non-vectored) | Scanline 240 (VBLANK) | Z8002 |
| Watchdog | Reset at $A100 | Z80 |

### DIP Switch Configuration

| Setting | Options |
|---------|---------|
| Qualifying time | 90 / 100 / 110 / 120 seconds |
| Practice rank (qualifying difficulty) | A through H |
| Extended rank (race difficulty) | A through H |
| Number of laps | 3 / 4 / 5 / 6 |
| Speed | Average / High |
| Display units | KPH / MPH |
| Attract sound | On / Off |
| Coin settings | Various (including free play) |

### Power and Environment

- **Power consumption**: 250W
- **Operating temperature**: 0-38 degrees C

---

## 8. Asset Plan: Art and Sound

### Art Assets Required

#### Player Car

| Asset | Description | Approach |
|-------|-------------|----------|
| Car rear (straight) | Player car from behind, driving straight | Create pixel art, 32x32 sprite |
| Car rear (left turn) | Player car angled slightly right (turning left) | Create pixel art, 32x32 sprite |
| Car rear (right turn) | Player car angled slightly left (turning right) | Create pixel art, 32x32 sprite |
| Explosion frames (4-6) | Sequential explosion animation | Create pixel art sprite sheet |
| Debris sprites | Scattered car parts post-crash | Create pixel art, multiple small sprites |

#### AI / Opponent Cars

| Asset | Description | Approach |
|-------|-------------|----------|
| AI car rear view (3-4 color variants) | Opponent cars seen from behind | Create pixel art, 16x16 and 32x32 scaled versions |
| AI car angled views | Side-angle views for passing | Create pixel art variations |

#### Road Elements

| Asset | Description | Approach |
|-------|-------------|----------|
| Road surface | Asphalt texture strips with center line, shoulder markings | Procedurally generated per-scanline (no sprite needed) |
| Grass texture | Green roadside area | Solid color or simple pattern (procedural) |
| Puddle | Water patch on track | Small sprite or road overlay effect |
| Start/finish line | Checkered pattern | Road overlay sprite |
| Grid position markers | Starting grid positions | Road markings |

#### Roadside Objects (Billboard Sprites)

Since the original used real-world brand logos (Marlboro, Pepsi, Canon, etc.), a recreation must use **original fictional replacements**:

| Original Brand | Replacement Concept | Notes |
|----------------|-------------------|-------|
| Marlboro | "TURBO" or fictional racing brand | Red/white color scheme |
| Pepsi | "ZOOM COLA" or similar | Blue/red/white color scheme |
| Canon | "OPTIC" or fictional tech brand | Red/white |
| Champion | "VICTOR" or fictional parts brand | Yellow/blue |
| Martini & Rossi | "VELOCE" or fictional brand | Stripe pattern |
| Agip | "FUEL+" or fictional oil brand | Yellow/green |
| S.E.V. | "SPARK" or fictional parts brand | Blue/white |

Additional roadside objects:
- Road signs / distance markers
- Trees (if adding to scenery)
- Light posts

#### Background / Scenery

| Asset | Description | Approach |
|-------|-------------|----------|
| Sky gradient | Blue sky with gradient to horizon | Tilemap or procedural gradient |
| Mountains | Mountain range silhouette | Tilemap tiles, 8x8 px each |
| Mt. Fuji | Snow-capped distinctive peak | Tilemap tiles or single large graphic |
| Clouds (optional) | Parallax sky decoration | Tilemap or sprite |

#### UI Elements

| Asset | Description | Approach |
|-------|-------------|----------|
| Font / character set | Alphanumeric characters for score, timer, speed | 8x8 pixel bitmap font |
| Speedometer | Speed display | Numeric text rendering |
| Tachometer (optional) | RPM indicator | Simple bar or needle graphic |
| Position indicator | "YOU ARE IN Xth" | Text overlay |
| Timer display | Countdown timer | Numeric text rendering |
| Qualifying/race banners | "QUALIFYING START", "GRAND PRIX" | Text or simple banner graphic |

### Art Asset Creation Plan

#### Option A: Pixel Art (Recommended for Authenticity)

1. **Tool**: Aseprite, Piskel, or LibreSprite (open-source)
2. **Palette**: Define a 128-color palette matching the original's weighted-resistor output
3. **Workflow**:
   - Start with player car sprites (most visible, most important feel)
   - Create billboard sprites with original fictional branding
   - Build background tilemap in 8x8 tile grid
   - Create explosion animation frames
   - Build UI font/character set
4. **Reference**: Sprite sheets are available at The Spriters Resource (`spriters-resource.com/arcade/poleposition/`) for study/reference (NOT for direct use due to copyright)
5. **Resolution**: Stay true to 256x224 pixel canvas, design at 1x then scale for modern displays

#### Option B: AI-Assisted Generation + Manual Cleanup

1. **Generate** base sprites using pixel art AI tools (e.g., PixelLab, Stable Diffusion with pixel art LoRA)
2. **Manually clean up** to exact sprite dimensions and color palette
3. **Advantage**: Faster iteration on billboard designs and background art
4. **Risk**: May need significant cleanup to match retro aesthetic

#### Option C: Open-Source / CC-Licensed Assets + Modifications

1. Search **OpenGameArt.org** for racing game sprite packs
2. Search **itch.io** asset packs for retro racing sprites
3. Modify found assets to match Pole Position's specific style and dimensions
4. **Advantage**: Fastest path to playable prototype
5. **Risk**: May not closely match the original aesthetic

### Sound Assets Required

#### Engine Sound

| Sound | Description | Approach |
|-------|-------------|----------|
| Engine loop (idle) | Low-pitch engine hum at rest | **Synthesize** -- generate procedurally using oscillator with frequency mapped to speed variable |
| Engine loop (varying pitch) | Continuous tone that rises with speed | Same synthesized approach, pitch = f(speed) |
| Engine deceleration | Pitch drops when releasing throttle | Synthesized, reverse pitch curve |

**Recommended approach**: Procedural audio synthesis at runtime. The original used an analog discrete circuit. Modern equivalent: generate a sawtooth/square wave oscillator whose frequency is mapped to car speed. This is the most authentic and flexible approach.

#### Discrete Sound Effects

| # | Sound | Duration | Creation Approach |
|---|-------|----------|-------------------|
| 1 | Coin insert / credit | 0:02 | Synthesize (short ascending tone) |
| 2 | Qualifying start fanfare | 0:06 | Compose chiptune jingle (WSG-style wavetable) |
| 3 | "Qualifying Start" voice | 0:03 | Record voice sample or use TTS + retro filter |
| 4 | Start sign countdown | 0:02 | Synthesize (beep sequence) |
| 5 | Qualifying complete (non-pole) | 0:04 | Compose short chiptune jingle |
| 6 | Qualifying complete (pole) | 0:04 | Compose short triumphant jingle |
| 7 | "Grand Prix Start" voice | 0:04 | Record voice sample or TTS + retro filter |
| 8 | Race start countdown | 0:05 | Synthesize (beep sequence, similar to #4) |
| 9 | Race complete | 0:04 | Compose short chiptune jingle |
| 10 | Name entry music - 1st | 0:27 | Compose chiptune loop |
| 11 | Name entry music - mid | 0:27 | Compose chiptune loop (different melody) |
| 12 | Name entry music - low | 0:38 | Compose chiptune loop (different melody) |
| 13 | Game over music | 0:10 | Compose chiptune melody |
| 14 | Time extend | 0:03 | Synthesize (ascending arpeggio) |
| 15 | Puddle hit | 0:01 | Synthesize (white noise splash) |
| 16 | Time bonus tick | 0:01 | Synthesize (short beep) |
| 17 | Overtake bonus tick | 0:01 | Synthesize (short beep, different pitch) |
| 18 | Crash/explosion | 0:03 | Synthesize (LFSR noise burst with decay envelope, matching Namco 54XX behavior) |
| 19 | Roadside driving | 0:03 | Synthesize (rumble noise) |

#### Tire Screech

| Sound | Description | Approach |
|-------|-------------|----------|
| Tire screech | Sharp turn tire squeal | Synthesize using filtered noise (LFSR-based, matching Namco 54XX) |
| Tire screech intensity | Varies with turn sharpness | Parameterized synthesis |

### Sound Asset Creation Plan

#### Option A: Procedural/Synthesized Audio (Recommended for Authenticity)

1. **Engine**: Runtime oscillator synthesis -- sawtooth wave with frequency mapped to speed
2. **SFX**: Use a Web Audio API synthesizer or similar to generate:
   - LFSR-based noise for explosions and tire screeches (matching the Namco 54XX approach)
   - Wavetable synthesis for jingles (matching the Namco WSG 8-voice approach)
   - Simple oscillator tones for UI sounds
3. **Voice samples**: Record "Qualifying Start" and "Grand Prix Start" voice lines, apply 4-bit downsampling and low-pass filter to match Namco 52XX output quality
4. **Music**: Compose original chiptune melodies using wavetable synthesis (8 voices max for authenticity)
5. **Tools**: jsfxr/sfxr for quick SFX prototyping, FamiTracker or BeepBox for chiptune music composition

#### Option B: Recorded + Processed Audio

1. Record engine sounds from real vehicles, heavily process with bit-crushing and low-pass filtering
2. Record tire screeches, explosions from foley or sound libraries
3. Apply retro audio processing: 4-bit quantization, low sample rate (8kHz), mono
4. **Sources for free sound effects**: Freesound.org (CC-licensed), Sonniss GDC audio bundles

#### Option C: Rip Reference Audio + Recreate

1. Study original sounds from The Sounds Resource (`sounds.spriters-resource.com/arcade/poleposition/`) for reference
2. Recreate each sound from scratch using synthesis, matching the character and envelope of originals
3. Ensures legal safety while maintaining authentic feel

### Asset Pipeline Summary

| Phase | Art | Sound | Timeline |
|-------|-----|-------|----------|
| 1. Reference Study | Study original sprite sheets, screenshots, gameplay footage | Study original sound recordings, analyze waveforms | Week 1 |
| 2. Core Gameplay | Player car (3 angles), road rendering, 2 billboard types | Engine synthesis, crash/explosion, tire screech | Week 2-3 |
| 3. Full Asset Set | All billboards, background tilemap, explosion anim, AI cars | All 19 SFX, voice samples | Week 4-5 |
| 4. Polish | Color palette tuning, sprite cleanup, animation smoothing | Mix levels, retro filtering, music composition | Week 6 |
| 5. UI/HUD | Font, score display, timer, position indicator | UI beeps, jingles | Week 7 |

---

## References

- [Pole Position - Wikipedia](https://en.wikipedia.org/wiki/Pole_Position_(video_game))
- [MAME Pole Position Driver Source](https://github.com/mamedev/mame/blob/master/src/mame/namco/polepos.cpp)
- [MAME Pole Position Video Source](https://github.com/mamedev/historic-mame/blob/master/src/mame/video/polepos.c)
- [Pole Position Arcade Manual (4th Printing) - Internet Archive](https://archive.org/stream/polepositiontm-2184thprinting111/)
- [Pole Position DIP Switch Settings - Arcade Museum](https://www.arcade-museum.com/dipswitch-settings/pole-position)
- [Pole Position World Record Analysis - Arcade Museum Forums](https://forums.arcade-museum.com/threads/pole-position-world-record-tracking-and-the-lap-times-required-to-get-67-310.281561/)
- [Pole Position Sprites - The Spriters Resource](https://www.spriters-resource.com/arcade/poleposition/)
- [Pole Position Sounds - The Sounds Resource](https://sounds.spriters-resource.com/arcade/poleposition/)
- [Pseudo-3D Road Rendering (Straights) - Jake Gordon](https://jakesgordon.com/writing/javascript-racer-v1-straight/)
- [Pseudo-3D Road Rendering (Curves) - Jake Gordon](https://jakesgordon.com/writing/javascript-racer-v2-curves/)
- [Pseudo-3D Road Rendering (Hills) - Jake Gordon](https://jakesgordon.com/writing/javascript-racer-v3-hills/)
- [Namco Pole Position System Board - Codex Gamicus](https://gamicus.fandom.com/wiki/Namco_Pole_Position_(system_board))
- [NamCompendium 12: Pole Position](https://namcompendium.wordpress.com/2018/09/24/namcompendium-12-pole-position/)
- [Namco 54XX Application - WhiteRocker](http://www.whiterocker.com/blog/namco-54xx-application.html)
- [System 16 - Namco Pole Position Hardware](https://www.system16.com/hardware.php?id=515)
