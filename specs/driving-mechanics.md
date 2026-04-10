# Driving Mechanics

## Overview

Player car physics, input handling, collision detection, and AI opponent behavior that recreates the feel of the original Pole Position arcade controls.

## User Stories

- As a player, I want responsive steering and acceleration so that the car feels good to drive
- As a player, I want to shift between low and high gear for strategic speed management
- As a player, I want to weave through AI traffic as a core gameplay challenge
- As a player, I want crashes to feel impactful but not end the game

## Requirements

### Player Input
- [ ] Keyboard steering (left/right arrow keys) with analog-like proportional response
- [ ] Keyboard acceleration (up arrow or dedicated key) with variable throttle feel
- [ ] Keyboard braking (down arrow or dedicated key)
- [ ] Gear shifting between Low and High (dedicated key toggle)
- [ ] Optional: gamepad/steering wheel support via Gamepad API

### Speed and Acceleration
- [ ] Speed increases proportionally with throttle input
- [ ] Low gear: better acceleration at low speeds, caps at roughly half top speed (~144 internal units)
- [ ] High gear: full top speed (configurable: 195/225/244 MPH), slower initial acceleration
- [ ] Optimal shift point at approximately 100-130 MPH
- [ ] Releasing throttle causes gradual deceleration
- [ ] Braking causes faster deceleration
- [ ] Top speed configurable via DIP switch equivalent settings (Average: 195, Default: 225, High: 244 MPH)

### Steering Physics
- [ ] Proportional steering - degree of input determines turn sharpness
- [ ] At higher speeds, steering is more sensitive (easier to lose control)
- [ ] Car slides/loses control when taking curves too fast
- [ ] Player car position updates based on speed and steering input relative to road curve

### Off-Road Behavior
- [ ] Driving onto grass dramatically reduces speed (but does not destroy the car)
- [ ] Car can be steered back onto the road at any time
- [ ] Visual/audio feedback when driving on grass

### Collision System
- [ ] Collision with AI cars: car explodes, respawn after ~2-3 seconds at zero speed
- [ ] Collision with roadside billboards/signs: car explodes, respawn after ~2-3 seconds at zero speed
- [ ] Driving into puddle: brief loss of control / spin effect
- [ ] Explosion: multi-frame animation plays for ~2-3 seconds
- [ ] Respawn: car reappears center of road at zero speed
- [ ] Crashing does NOT end the game - only time running out ends the game

### Player Car Visuals
- [ ] Car shown from behind (rear perspective)
- [ ] Separate sprite states: straight, turning left, turning right
- [ ] Subtle bounce animation at higher speeds
- [ ] Explosion animation (4-6 frames) on crash
- [ ] Debris sprites visible during explosion

### AI Opponent Cars
- [ ] Seven computer-controlled cars race alongside the player
- [ ] AI cars follow predetermined paths on the road
- [ ] Traffic density increases in later laps compared to qualifying
- [ ] AI cars move at set speeds (no rubber-banding)
- [ ] AI cars rendered with distance-based scaling (smaller when far, larger when near)
- [ ] Various colored opponent cars (3-4 color variants)
- [ ] Player must weave through traffic as obstacles

## Acceptance Criteria

- [ ] Car responds immediately to keyboard input with no perceptible lag
- [ ] Gear shifting noticeably affects acceleration and top speed
- [ ] Collisions trigger explosion animation and proper respawn behavior
- [ ] AI cars are visible at varying distances and scale correctly
- [ ] Driving on grass slows the car dramatically
- [ ] Taking curves too fast causes visible loss of control

## Out of Scope

- Damage model (car is either fine or exploded)
- Car customization
- Multiplayer
- Replay system
