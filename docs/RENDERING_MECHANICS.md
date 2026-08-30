# Colosseum rendering mechanics

This is a compact record of cache/rendering facts used by the trainer.

## Sol dust effects

- Sol's auto-attack ground effects use cache spotanim `2669` (variants `2670`
  through `2672` also exist).
- `SolGroundSlam` supplies the gameplay delay and uses a spotanim-only cache
  reference. The effect is one-shot; its entity lifetime must cover the graphic
  duration without causing a second replay.
- Repeated effects should use the SDK's instanced spotanim renderer. Effects
  with different delays require separate pools because delay is part of the
  shared animation phase.

## Arena boundaries

- Arena bounds are `x=19..34`, `y=18..33`.
- WallMen occupy the perimeter. Sol hazards are intentionally restricted to
  the strict interior (`x=20..33`, `y=19..32`) so no attack is placed on a
  WallMan tile.
- WallMen use cache models `50963` and `50964`, face cardinally inward, and are
  instanced by model variant. Corner pillar overlap blockers remain invisible.
