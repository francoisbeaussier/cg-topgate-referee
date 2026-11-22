# Top Gate referee

The referee of **Top Gate**, a CodinGame community multiplayer game: FPV drone racing through solid ring gates, 2 to 4
drones, flown with radio sticks (THROTTLE, YAW, PITCH, ROLL) in ANGLE or ACRO mode.

This is the exact code that runs on CodinGame: the rules, the physics, the track generator and the viewer. It is
published so you can check any rule, or port the simulation into your bot or a local arena. The league bosses are not
included.

## Contents

| Path | What it is |
|---|---|
| `src/main/java/topgate/sim/` | The game itself, with no CodinGame dependency: `Game` (one turn: controls, motors, movement, collisions, gates, cells), `Rules` (constants and per-league rules), `Track` (track generator), `Drone`, `Command` (output parser), `Vec3`, `Rng` |
| `src/main/java/com/codingame/game/` | The CodinGame glue: `Referee` (inputs, outputs, timeouts, scores), `FpvModule` (sends frames to the viewer), `Player` |
| `src/main/resources/view/` | The viewer (FPV, chase and TV cameras, sound) |
| `config/` | `statement_en.html.tpl` (the statement of every league), `stub.txt` (the input format), `config.ini` |

## Build

Java 17 and Maven:

```
mvn compile
```

Maven downloads the CodinGame game engine (`com.codingame.gameengine`, version 4.7.8) on the first build.

## Leagues

The game has 4 leagues, shown on CodinGame as Wood 4 (lowest) to Wood 1. `Rules.forLevel(level)` maps each to a rule
set:

| League | Level | Rule set | Adds |
|---|---|---|---|
| Wood 4 | 1 | 2 | up to 4 drones, drones bounce off each other |
| Wood 3 | 2 | 3 | CRASH and damage, BOOST, smaller gates, ladders and hairpins |
| Wood 2 | 3 | 4 | power cells (CHARGE, SHIELD, GHOST) |
| Wood 1 | 4 | 6 | twice as powerful drones, pylons, 3 boosts, longer tracks |

## Running races locally

The referee runs with the CodinGame SDK's runner (`com.codingame.gameengine.runner.MultiplayerGameRunner`, already a
dependency): give it the level, a seed and one command line per bot, then either `start()` it to watch the race in
your browser or `simulate()` it to get the scores. See the
[SDK documentation](https://www.codingame.com/playgrounds/25775/codingame-sdk-documentation/) for details.

A race is fully determined by the level, the seed, the number of players and the bots' outputs.

## Rules

The statement (`config/statement_en.html.tpl`) has the full rules, including an "Expert rules" section that gives the
exact order of operations in a turn. Where the statement and the code disagree, the code is what runs; please report
it.

## License

MIT, see `LICENSE`.
