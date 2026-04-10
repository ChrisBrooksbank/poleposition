# Game Flow

## Overview

Complete game loop including qualifying lap, Grand Prix race, scoring, timer management, high score entry, and all game state transitions.

## User Stories

- As a player, I want to qualify for the race by completing a timed lap so that my starting position feels earned
- As a player, I want to race against AI cars with a countdown timer creating urgency
- As a player, I want to see my score and enter my initials for the high score table
- As a player, I want the full arcade experience: coin insert, qualifying, race, game over

## Requirements

### Game States
- [ ] Attract mode / title screen (idle demo when no game active)
- [ ] Coin insert / credit screen (start game prompt)
- [ ] Qualifying lap (timed single lap)
- [ ] Grid position display (show starting position after qualifying)
- [ ] Grand Prix race (multi-lap race with timer)
- [ ] Race complete (all laps finished)
- [ ] Game over (time expired)
- [ ] High score name entry
- [ ] Transitions between all states with appropriate animations/screens

### Qualifying Lap
- [ ] Player completes one lap of Fuji Speedway within a time limit
- [ ] Timer setting configurable: 90, 100, 110, or 120 seconds (default: 90)
- [ ] Must finish under 73 game-seconds to qualify (Practice Rank C default)
- [ ] Qualifying time determines starting grid position (1st through 8th)
- [ ] Position thresholds: 1st < 58.50s, 2nd < 60.00s, 3rd < 62.00s, 4th < 64.00s, 5th < 66.00s, 6th < 68.00s, 7th < 70.00s, 8th < 73.00s
- [ ] Failing to qualify within time limit ends the game
- [ ] "Qualifying Start" announcement at beginning

### Grand Prix Race
- [ ] Race begins after qualifying with player in their earned grid position
- [ ] Number of laps configurable: 3, 4, 5, or 6 (default: 4)
- [ ] Countdown timer runs throughout the race
- [ ] Lap 1 starts with 75 seconds
- [ ] Bonus time on lap completion: Lap 2 +51s, Lap 3 +57s, Lap 4 +61s
- [ ] Timer resolution: 40 frames per second
- [ ] Time expiring before completing a lap ends the game immediately
- [ ] "Grand Prix Start" announcement at beginning
- [ ] Lap counter display

### Scoring
- [ ] Distance score: 50 points per 5 meters driven (10 points/meter)
- [ ] One full lap: approximately 10,000 points
- [ ] Passing bonus: 50 points per car fully overtaken
- [ ] Qualifying position bonus: 1st=4000, 2nd=2000, 3rd=1400, 4th=1000, 5th=800, 6th=600, 7th=400, 8th=200
- [ ] Time bonus: 200 points per second remaining when race ends
- [ ] Maximum theoretical score: ~67,310 points (tournament settings)

### HUD / UI Display
- [ ] Speed display (MPH or KPH, configurable)
- [ ] Lap timer / countdown
- [ ] Current lap number / total laps
- [ ] Score display
- [ ] Grid position / race position indicator
- [ ] "YOU ARE IN Xth" position text
- [ ] Qualifying/race banners ("QUALIFYING START", "GRAND PRIX")

### High Score System
- [ ] Persistent high score storage (localStorage)
- [ ] Name entry using keyboard (3 initials, matching original's steering wheel letter selection feel)
- [ ] Three ranking tiers with different music: 1st place, 2nd-6th, 7th-100th
- [ ] High score table display

### DIP Switch Settings (Configuration)
- [ ] Qualifying time: 90/100/110/120 seconds
- [ ] Practice rank (qualifying difficulty): A through H
- [ ] Extended rank (race difficulty): A through H
- [ ] Number of laps: 3/4/5/6
- [ ] Speed: Average/High
- [ ] Display units: KPH/MPH

## Acceptance Criteria

- [ ] Complete game loop plays from start to game over without errors
- [ ] Qualifying determines grid position correctly based on time thresholds
- [ ] Timer counts down accurately at 40 FPS resolution
- [ ] Bonus time is correctly added on lap completion
- [ ] Scoring matches the formula from research.md
- [ ] High scores persist across browser sessions
- [ ] All game state transitions are smooth

## Out of Scope

- Actual coin-op hardware integration
- Network high score leaderboards
- Save states / pause (original had no pause)
- Multiple difficulty presets beyond DIP switch options
