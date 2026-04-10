# Road Rendering

## Overview

Pseudo-3D road rendering system that recreates the Fuji Speedway circuit using horizontal scanline strips with perspective projection, curves, and hills.

## User Stories

- As a player, I want to see a convincing 3D road stretching into the distance so that I feel immersed in the racing experience
- As a player, I want to see curves and hills on the track so that the course feels like a real circuit
- As a player, I want to see roadside objects (billboards, signs) that scale with distance so the world feels three-dimensional

## Requirements

### Road Surface
- [ ] Render road as horizontal strips using perspective projection: `screen_scale = cameraDepth / z_distance`
- [ ] Road width narrows toward the vanishing point
- [ ] Center line dashes rendered with distance-based spacing
- [ ] Shoulder stripes (red/white rumble strips) on both edges
- [ ] Road surface alternates between two shades of gray for depth perception (segment coloring)
- [ ] Grass on both sides of the road, alternating between two shades of green

### Curves
- [ ] Curves achieved by accumulating horizontal offsets per scanline strip
- [ ] Each segment adds a curve value to a running `dx` offset
- [ ] Vanishing point sways side-to-side as the player approaches corners
- [ ] Smooth interpolation between straight and curved sections

### Hills (Stretch Goal)
- [ ] Y-coordinate offsets per segment project strips higher or lower on screen
- [ ] Hill crests obscure the road ahead
- [ ] Dips reveal more road in the distance

### Track Layout - Fuji Speedway
- [ ] Main straight (start/finish line, longest straight)
- [ ] Sharp right turn
- [ ] Quick left turn (S-curve feel with previous)
- [ ] Medium right turn
- [ ] Left hairpin (tightest turn on circuit)
- [ ] Long gradual right curve back to main straight
- [ ] Track is a continuous loop (~4.36 km per lap)

### Roadside Objects
- [ ] Billboards placed along both sides of the track at defined intervals
- [ ] Billboard sprites scale proportionally with distance (larger near, smaller far)
- [ ] Original branded billboards replaced with fictional equivalents:
  - "TURBO" (red/white), "ZOOM COLA" (blue/red/white), "OPTIC" (red/white), "VICTOR" (yellow/blue), "VELOCE" (stripe pattern), "FUEL+" (yellow/green), "SPARK" (blue/white)
- [ ] Road signs / distance markers along track edges
- [ ] Puddle sprites placed on the track surface at specific locations

### Background Scenery
- [ ] Sky gradient (blue to horizon)
- [ ] Mountain range silhouette with parallax scrolling relative to player movement
- [ ] Mt. Fuji as a prominent landmark visible in the background
- [ ] Background scrolls horizontally with road curves (parallax effect)

### Start/Finish Line
- [ ] Checkered pattern rendered across the road at the start/finish point
- [ ] Grid position markers visible at race start

## Acceptance Criteria

- [ ] Road renders at 60 FPS with smooth perspective projection
- [ ] Curves are visually smooth and convincing
- [ ] Roadside objects scale correctly with distance (no popping or size jumps)
- [ ] Background parallax scrolling is smooth and synced with road movement
- [ ] Track layout matches the Fuji Speedway circuit described in research.md

## Out of Scope

- Actual 3D geometry (this is pseudo-3D via 2D strips)
- Weather effects
- Night racing
- Alternative track layouts
