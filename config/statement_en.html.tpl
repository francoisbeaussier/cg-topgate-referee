<!-- LEAGUES level1 level2 level3 level4 -->
<div id="statement_back" class="statement_back" style="display:none"></div>
<div class="statement-body">

  <!-- BEGIN level1 -->
  <div style="color: #7cc576; background-color: rgba(124, 197, 118,.1); padding: 20px; margin-right: 15px; margin-left: 15px; margin-bottom: 10px; text-align: left;">
    <div style="text-align: center; margin-bottom: 6px"><img src="//cdn.codingame.com/smash-the-code/statement/league_wood_04.png" /></div>
    <p style="text-align: center; font-weight: 700; margin-bottom: 6px;">This is a league based game.</p>
    <div class="statement-league-alert-content">
      In this first league, up to <const>4</const> drones race and bounce off each other. Fly through the gates,
      in order, in the right direction.
    </div>
  </div>
  <!-- END -->
  <!-- BEGIN level2 -->
  <div style="color: #7cc576; background-color: rgba(124, 197, 118,.1); padding: 20px; margin-right: 15px; margin-left: 15px; margin-bottom: 10px; text-align: left;">
    <p style="text-align: center; font-weight: 700; margin-bottom: 6px;">Summary of new rules</p>
    <div class="statement-league-alert-content">
      Impacts now CRASH you (motors off for a few turns) and damage your drone. You get a <action>BOOST</action>,
      smaller gates, and tracks with ladders and hairpins.
    </div>
  </div>
  <!-- END -->
  <!-- BEGIN level3 -->
  <div style="color: #7cc576; background-color: rgba(124, 197, 118,.1); padding: 20px; margin-right: 15px; margin-left: 15px; margin-bottom: 10px; text-align: left;">
    <p style="text-align: center; font-weight: 700; margin-bottom: 6px;">Summary of new rules</p>
    <div class="statement-league-alert-content">
      Power cells float beside the track: <const>CHARGE</const>, <const>SHIELD</const> and <const>GHOST</const>.
    </div>
  </div>
  <!-- END -->
  <!-- BEGIN level4 -->
  <div style="color: #7cc576; background-color: rgba(124, 197, 118,.1); padding: 20px; margin-right: 15px; margin-left: 15px; margin-bottom: 10px; text-align: left;">
    <p style="text-align: center; font-weight: 700; margin-bottom: 6px;">Summary of new rules</p>
    <div class="statement-league-alert-content">
      Racing drones are twice as powerful, pylons stand on the track, and you start with <const>3</const> boosts.
      This is the final league.
    </div>
  </div>
  <!-- END -->

  <div class="statement-section statement-goal">
    <h1><span class="icon icon-goal">&nbsp;</span><span>The Goal</span></h1>
    <div class="statement-goal-content">
      Pilot a racing drone through the gates of an indoor arena. Finish <const>3</const> laps before your
      opponents.
    </div>
    <p style="margin-top: 12px;"><strong>The real thing:</strong> to see how fast and precise professional pilots
      are, check out the <a href="https://www.youtube.com/live/_LDYBkr9M0M?t=7624" target="_blank" rel="noopener">MultiGP
      finale of October 2026</a>.</p>
  </div>

  <div class="statement-section statement-rules">
    <h1><span class="icon icon-rules">&nbsp;</span><span>Rules</span></h1>
    <div class="statement-rules-content">
      <h3 style="font-size: 16px; font-weight: 700; padding-top: 20px; color: #838891; padding-bottom: 15px;">The arena and the track</h3>
      <p><strong>The arena</strong> is a box: <var>x</var> from <const>0</const> to <const>12000</const> (east),
        <var>y</var> from <const>0</const> to <const>12000</const> (north), <var>z</var> from <const>0</const>
        (the floor) to <const>5000</const> (the ceiling). Walls and the ceiling bounce you back at half the speed
        you hit them with.
        <!-- BEGIN level2 level3 level4 -->
        Every hit can make you CRASH (see Collisions).
        <!-- END -->
        Distances are in units, speeds in units per turn.</p>

      <!-- BEGIN level1 -->
      <p><strong>Gates</strong> are solid rings of radius <const>1000</const> (a tube of radius
        <const>40</const>), each with a centre and a direction <var>n</var>. To clear your next gate, fly through
        the ring in the direction of <var>n</var>: your centre must pass more than <const>240</const> inside the
        ring (within <const>760</const> of its centre) or you touch it. The gate counts once your whole drone is through (your centre <const>200</const> past the ring); going back first does not count. Every ring is solid like a wall, and rings are one-way: from the front, the inside of a ring is a wall too, so you can never fly through a ring backwards.
      <!-- END -->
      <!-- BEGIN level2 level3 level4 -->
      <p><strong>Gates</strong> are solid rings of radius <const>650</const> (a tube of radius
        <const>40</const>), each with a centre and a direction <var>n</var>. To clear your next gate, fly through
        the ring in the direction of <var>n</var>: your centre must pass more than <const>240</const> inside the
        ring (within <const>410</const> of its centre) or you touch it. The gate counts once your whole drone is through (your centre <const>200</const> past the ring); going back first does not count. Every ring is solid like a wall, and rings are one-way: from the front, the inside of a ring is a wall too, so you can never fly through a ring backwards.
      <!-- END -->
        A gate crossed between two turns counts. Your first target is gate <const>1</const>; a lap is gates
        <const>1</const>, <const>2</const>, &hellip;, then gate <const>0</const>, the start and finish line.</p>
      <p><strong>Start:</strong> the drones sit on the floor at least <const>800</const> in front of gate
        <const>0</const> and clear of every ring, facing gate <const>1</const>, all at the same distance from it,
        <const>450</const> apart (less when space is short). Gate
        <const>1</const> is at most <const>4000</const> away horizontally from gate <const>0</const>.</p>
      <!-- BEGIN level2 level3 level4 -->
      <p>Tracks can contain a <strong>ladder</strong> (two rings stacked on top of each other, flown in opposite
        directions) or a <strong>hairpin</strong> (two rings side by side, flown in opposite directions).</p>
      <!-- END -->
      <!-- BEGIN level4 -->
      <p><strong>Pylons</strong> are columns from the floor to the ceiling: <const>0</const> to <const>4</const> of
        them, each at least <const>1300</const> + its radius away from every gate centre (horizontally). Pylons are
        solid like walls, even for a GHOST (see Power cells).</p>
      <!-- END -->

      <h3 style="font-size: 16px; font-weight: 700; padding-top: 20px; color: #838891; padding-bottom: 15px;">Your drone</h3>
      <p>Your drone is a sphere of radius <const>200</const>. Each turn you set
        <action>THROTTLE</action> (<const>0</const> to <const>100</const>), <action>YAW</action>,
        <action>PITCH</action> and <action>ROLL</action> (<const>-100</const> to <const>100</const>). The motors
        push along the drone's <em>up</em> axis and gravity pulls it down; the drone keeps its speed from turn to
        turn. Tilt and add throttle to fly forward.
        <!-- BEGIN level1 -->
        <action>THROTTLE</action> <const>40</const> hovers.</p>
        <!-- END -->
        <!-- BEGIN level2 level3 -->
        <action>THROTTLE</action> <const>40</const> hovers (more once crashes have damaged your drone).</p>
        <!-- END -->
        <!-- BEGIN level4 -->
        In this league, racing drones are twice as powerful: <action>THROTTLE</action> <const>20</const> hovers (more
        once crashes have damaged your drone).</p>
        <!-- END -->

      <p><strong>Battery:</strong> it loses <const>1</const> per turn. Clearing a gate recharges it to
        <const>100</const>. At <const>0</const>, the motors stop.</p>

      <p><strong>Floor:</strong> you may land and take off again. A drone that touches the floor faster than
        <const>150</const> downwards, or with its motors stopped (CRASH or empty battery), is destroyed.</p>
      <!-- BEGIN level1 -->
      <p>While your motors are stopped, your sticks are ignored.</p>
      <!-- END -->
      <!-- BEGIN level2 -->
      <p>While your motors are stopped, your sticks and <action>BOOST</action> are ignored.</p>
      <!-- END -->
      <!-- BEGIN level3 level4 -->
      <p>While your motors are stopped, your sticks, <action>BOOST</action> and <action>USE</action> are ignored.</p>
      <!-- END -->

      <h3 style="font-size: 16px; font-weight: 700; padding-top: 20px; color: #838891; padding-bottom: 15px;">The radio</h3>
      <p>The sticks follow the usual Mode 2 radio layout: the left stick is
        <action>THROTTLE</action> (up and down) and <action>YAW</action> (left and right), the right stick is
        <action>PITCH</action> (up and down) and <action>ROLL</action> (left and right).</p>
      <p style="text-align: center;"><img src="https://cdn-games.codingame.com/community/765200-1794650409220/1ef187a68896bfb50a126f43737001526793b91b3fadcc5b693c1aa5c98da687.png" alt="mode2" style="max-width: 100%;" /></p>
      <p style="text-align: center;"><img src="https://cdn-games.codingame.com/community/765200-1794650409220/94f3c0e0678bc394d6cf77d57b0a539824615fb98cc767b6a534319dd8ecfdf1.gif" alt="sticks" style="max-width: 100%;" /><br>
        <em>What each stick does, in ANGLE mode.</em></p>
      <ul>
        <li><action>ANGLE</action> mode (the default, self-levelling): <action>PITCH</action> and
          <action>ROLL</action> set how far the drone leans, up to <const>60°</const> each (positive pitch leans
          forward, positive roll leans right). <action>YAW</action> turns it, up to <const>15°</const> per turn
          (positive turns right). Centred sticks bring the drone back level.</li>
        <li><action>ACRO</action> mode (the racing mode): the sticks set rotation speeds around the drone's own
          axes: <action>PITCH</action> tips the nose down (positive) or up and <action>ROLL</action> rolls right
          (positive) or left, up to <const>30°</const> per turn each; <action>YAW</action> spins right (positive) or
          left, up to <const>15°</const> per turn (yaw is a drone's slowest axis).
          Centred sticks slow the rotation to a stop. There is no tilt limit: you can lean further, or flip.</li>
      </ul>
      <p>Rotation has inertia in both modes: it takes a few turns to build up and to stop. In
        <action>ANGLE</action> the flight controller handles it for you. You choose the mode with the first word of
        your first output; without it you fly <action>ANGLE</action> for the whole race.</p>
      <!-- BEGIN level1 -->
      <p><strong>Tip:</strong> <action>ANGLE</action> is the easiest way round the track. <action>ACRO</action> can
        lean further and turn faster, but your bot has to do the levelling itself.</p>
      <!-- END -->

      <!-- BEGIN level1 -->
      <h3 style="font-size: 16px; font-weight: 700; padding-top: 20px; color: #838891; padding-bottom: 15px;">Other drones</h3>
      <!-- END -->
      <!-- BEGIN level2 level3 level4 -->
      <h3 style="font-size: 16px; font-weight: 700; padding-top: 20px; color: #838891; padding-bottom: 15px;">Collisions</h3>
      <!-- END -->
      <!-- BEGIN level1 -->
      <p><strong>Collisions:</strong> drones bounce off each other. For the first <const>30</const> turns, every
        drone is a ghost and flies through the others.</p>
      <!-- END -->
      <!-- BEGIN level2 level3 level4 -->
      <p><strong>Collisions:</strong> drones bounce off each other. For the first <const>30</const> turns, every
        drone is a ghost and flies through the others.</p>
      <p><strong>CRASH:</strong> every impact
      <!-- BEGIN level2 level3 -->
      (wall, ceiling, ring or another drone)
      <!-- END -->
      <!-- BEGIN level4 -->
      (wall, ceiling, ring, pylon or another drone)
      <!-- END -->
        at speed <var>s</var> stops your motors for floor(<var>s</var> / <const>50</const>) turns, at
        most <const>10</const>: a touch under <const>50</const> is free, a hit at <const>250</const> costs
        <const>5</const> turns. You fall without turning. Two drones that collide CRASH by the same amount. The
        motors restart early if, at the start of a turn, the bottom of your drone is within <const>300</const> of
        the floor.</p>
      <p><strong>Damage:</strong> each CRASH turn you take lowers your maximum thrust by <const>2%</const>, down to
        <const>60%</const>, for the rest of the race.</p>
      <!-- END -->
      <p><strong>Slipstream:</strong> flying close behind another drone lowers your drag (see Expert rules).</p>

      <!-- BEGIN level2 -->
      <h3 style="font-size: 16px; font-weight: 700; padding-top: 20px; color: #838891; padding-bottom: 15px;">Boost</h3>
      <!-- END -->
      <!-- BEGIN level3 level4 -->
      <h3 style="font-size: 16px; font-weight: 700; padding-top: 20px; color: #838891; padding-bottom: 15px;">Boost and power cells</h3>
      <!-- END -->
      <!-- BEGIN level2 level3 level4 -->

      <p><strong>Boost:</strong> <action>BOOST</action> adds an instant <const>300</const> to your speed along the
        drone's up axis (lean to boost forward). You start with
        <!-- BEGIN level2 level3 -->
        <const>1</const> boost;
        <!-- END -->
        <!-- BEGIN level4 -->
        <const>3</const> boosts;
        <!-- END -->
        used boosts come back one every <const>40</const> turns, up to the starting number (see Expert rules).</p>
      <!-- END -->

      <!-- BEGIN level3 level4 -->
      <p><strong>Power cells</strong> float beside the track: up to one <const>CHARGE</const>, one
        <const>SHIELD</const> and one <const>GHOST</const>. Fly within <const>350</const> of one to take it; it comes
        back <const>60</const> turns later. Drones reaching it on the same instant all get it. With fewer than
        <const>3</const> cells, <const>CHARGE</const> comes first, then <const>SHIELD</const>.</p>
      <ul>
        <li><const>CHARGE</const>: the number of boosts is increased by <const>1</const> at once, even if this exceeds
          the starting number.</li>
        <li><const>SHIELD</const> and <const>GHOST</const> are kept until you output <action>USE</action>, one at a
          time: while you hold one, you cannot take either. <const>SHIELD</const>: for <const>30</const> turns,
          impacts involving you crash nobody. <const>GHOST</const>: for <const>30</const> turns, you fly through
          other drones.</li>
      </ul>
      <!-- END -->

      <h3 style="font-size: 16px; font-weight: 700; padding-top: 20px; color: #838891; padding-bottom: 15px;">Time and replays</h3>
      <p><strong>Time bank:</strong> no limit per turn; each bot has <const>28000</const> / <var>playerCount</var> ms
        for the whole race (<const>14000</const>, <const>9333</const> or <const>7000</const> ms), and
        <var>remainingTime</var>, the first line of each turn's input, gives what is left.</p>

      <p><strong>Replays:</strong> in the viewer settings, VIEW picks whose drone you follow, CAMERA picks FPV,
        CHASE or TV, SOUND turns sound on, SPEED shows km/h, mph or units per turn, and SMOOTH smooths the motion. The stopwatch in the bottom right shows the time bank. Output
        <action>CAM</action> <var>angle</var> (<const>0</const> to <const>60</const>, default <const>30</const>)
        to tilt your FPV camera up; it does not affect the race.</p>

      <div class="statement-victory-conditions">
        <div class="icon victory"></div>
        <div class="blk">
          <div class="title">Victory Conditions</div>
          <div class="text">Finish <const>3</const> laps first: the race ends as soon as one drone finishes. It also
            ends:
            <ul>
              <li>after <const>600</const> turns;</li>
              <li>when every drone is destroyed;</li>
              <li>when the only drone still flying has cleared more gates than every destroyed drone (until then,
                it keeps racing);</li>
              <li>when only one bot is left: a bot that times out or sends an invalid output is eliminated at
                once.</li>
            </ul>
            Drones that did not finish are ranked by gates cleared, then by distance to the centre of their next
            gate (when the race ends, or when they were destroyed). Eliminated bots rank last, a bot eliminated later
            ahead of one eliminated earlier. Equal results tie, for example drones finishing on the same turn, or
            bots eliminated on the same turn.</div>
        </div>
      </div>
      <div class="statement-lose-conditions">
        <div class="icon lose"></div>
        <div class="blk">
          <div class="title">Defeat Conditions</div>
          <div class="text">Your bot sends an invalid output (see Output), or its time bank runs out.</div>
        </div>
      </div>
    </div>
  </div>

  <div class="statement-section statement-protocol">
    <h1><span class="icon icon-protocol">&nbsp;</span><span>Game Input</span></h1>
    <div class="blk">
      <div class="title">Initialization input</div>
      <div class="text">
        <span class="statement-lineno">First line:</span> <const>4</const> space-separated integers
        <var>playerCount</var> <var>myId</var> <var>laps</var> <var>gateCount</var>.<br>
        <span class="statement-lineno">Next <var>gateCount</var> lines:</span> <const>7</const> space-separated values
        <var>gateX</var> <var>gateY</var> <var>gateZ</var> <var>nx</var> <var>ny</var> <var>nz</var> <var>radius</var>, one line
        per gate, gate <const>0</const> first:
        <ul>
          <li><var>gateX</var>, <var>gateY</var>, <var>gateZ</var>: integers, the centre of the gate.</li>
          <li><var>nx</var>, <var>ny</var>, <var>nz</var>: floats, the unit direction to fly through it.</li>
          <li><var>radius</var>: integer, the radius of the ring.</li>
        </ul>
        <span class="statement-lineno">Next line:</span> an integer <var>cellCount</var>
        <!-- BEGIN level1 level2 -->
        (<const>0</const> before Wood 2)
        <!-- END -->
        <br>
        <span class="statement-lineno">Next <var>cellCount</var> lines:</span> <const>4</const> space-separated values
        <var>cellX</var> <var>cellY</var> <var>cellZ</var> <var>cellType</var>: the position of a power cell (integers) and its type
        (<const>CHARGE</const>, <const>SHIELD</const> or <const>GHOST</const>).<br>
        <span class="statement-lineno">Next line:</span> an integer <var>pylonCount</var>
        <!-- BEGIN level1 level2 level3 -->
        (<const>0</const> before Wood 1)
        <!-- END -->
        <br>
        <span class="statement-lineno">Next <var>pylonCount</var> lines:</span> <const>3</const> space-separated integers
        <var>pylonX</var> <var>pylonY</var> <var>pylonRadius</var>: the axis and radius of a pylon.
      </div>
    </div>
    <div class="blk">
      <div class="title">Input for one game turn</div>
      <div class="text">
        <span class="statement-lineno">First line:</span> an integer <var>remainingTime</var>: the milliseconds left
        in your time bank for the rest of the race, at the start of this turn.<br>
        <span class="statement-lineno">Next <var>playerCount</var> lines:</span> <const>25</const> space-separated values,
        one line per drone in id order:
        <ul>
          <li><var>x</var> <var>y</var> <var>z</var>: floats, the position.</li>
          <li><var>vx</var> <var>vy</var> <var>vz</var>: floats, the speed.</li>
          <li><var>fx</var> <var>fy</var> <var>fz</var>: floats, the drone's forward unit vector.</li>
          <li><var>ux</var> <var>uy</var> <var>uz</var>: floats, the drone's up unit vector.</li>
          <li><var>nextGate</var>: integer, the next gate to clear.</li>
          <li><var>lap</var>: integer, laps completed.</li>
          <li><var>boosts</var>: integer, boosts available.</li>
          <li><var>boostTimer</var>: integer, turns until the next boost comes back.</li>
          <li><var>battery</var>: integer, the battery level.</li>
          <li><var>cutout</var>: integer, turns left in a CRASH.</li>
          <li><var>state</var>: integer, <const>0</const> destroyed, <const>1</const> flying, <const>2</const> finished.</li>
          <li><var>shield</var>: integer, turns left with a SHIELD.</li>
          <li><var>ghost</var>: integer, turns left as a GHOST.</li>
          <li><var>item</var>: integer, the held item: <const>0</const> none, <const>1</const> SHIELD, <const>2</const> GHOST.</li>
          <li><var>wx</var> <var>wy</var> <var>wz</var>: floats, the rotation the drone made last turn, as a rotation
            vector in arena axes (radians; its length is the angle). It is the current rotation speed, which
            carries over to the next turn.</li>
        </ul>
        <!-- BEGIN level1 -->
        <var>boosts</var>, <var>boostTimer</var>, <var>cutout</var>, <var>shield</var> and <var>item</var> are always
        <const>0</const> in this league; <var>ghost</var> counts down from <const>30</const> at the start.<br>
        <!-- END -->
        <!-- BEGIN level2 -->
        <var>shield</var> and <var>item</var> are always <const>0</const> in this league; <var>ghost</var> counts
        down from <const>30</const> at the start.<br>
        <!-- END -->
        <span class="statement-lineno">Next <var>cellCount</var> lines:</span> an integer <var>respawnTimer</var>, turns
        before the cell comes back: you can take it during this turn's move if <var>respawnTimer</var> &le;
        <const>1</const>.<br>
        A destroyed or finished drone's bot gets no more input.
      </div>
    </div>
    <div class="blk">
      <div class="title">Output for one game turn</div>
      <div class="text">
        <span class="statement-lineno">A single line:</span> optionally the flight mode word first (see below), then
        <action>THROTTLE</action> <action>YAW</action> <action>PITCH</action> <action>ROLL</action>, <const>4</const>
        space-separated integers (values out of range are clamped), then optionally
        <!-- BEGIN level1 -->
        <action>CAM</action> <var>angle</var> (see Replays),
        <!-- END -->
        <!-- BEGIN level2 -->
        <action>BOOST</action> and <action>CAM</action> <var>angle</var> (see Replays), in any order,
        <!-- END -->
        <!-- BEGIN level3 level4 -->
        <action>BOOST</action>, <action>USE</action> and <action>CAM</action> <var>angle</var> (see Replays), in any
        order,
        <!-- END -->
        and then a message to display.<br>
        The flight mode word, <action>ANGLE</action> (the default) or <action>ACRO</action> in upper case, is only
        read at the very start of the line. It sets the mode on your first output for the whole race; later mode
        words are ignored.<br>
        Example: <action>ANGLE 80 0 40 -10</action><br>
        Invalid output: the <const>4</const> tokens after the optional mode word are not all 32-bit integers.
      </div>
    </div>
    <div class="blk">
      <div class="title">Constraints</div>
      <div class="text">
        <!-- BEGIN level1 level2 level3 level4 -->
        <const>2</const> &le; <var>playerCount</var> &le; <const>4</const><br>
        <!-- END -->
        <!-- BEGIN level1 -->
        <const>3</const> &le; <var>gateCount</var> &le; <const>5</const><br>
        <!-- END -->
        <!-- BEGIN level2 -->
        <const>3</const> &le; <var>gateCount</var> &le; <const>7</const><br>
        <!-- END -->
        <!-- BEGIN level3 -->
        <const>3</const> &le; <var>gateCount</var> &le; <const>10</const><br>
        <!-- END -->
        <!-- BEGIN level4 -->
        <const>8</const> &le; <var>gateCount</var> &le; <const>12</const><br>
        <!-- END -->
        <!-- BEGIN level3 level4 -->
        <const>0</const> &le; <var>cellCount</var> &le; <const>3</const><br>
        <!-- END -->
        <!-- BEGIN level4 -->
        <const>0</const> &le; <var>pylonCount</var> &le; <const>4</const><br>
        <const>250</const> &le; pylon <var>radius</var> &le; <const>400</const><br>
        <!-- END -->
      </div>
    </div>
  </div>

  <div class="statement-section statement-expertrules">
    <h1><span class="icon icon-expertrules">&nbsp;</span><span>Expert Rules</span></h1>
    <div class="statement-expert-rules-content">
      <p>The drone's axes are <var>f</var> (forward, the nose), <var>u</var> (up) and <var>right</var> =
        <var>f</var> &times; <var>u</var> (its right side). Angles in the input are in radians. Each turn:</p>
      <ol>
        <!-- BEGIN level3 level4 -->
        <li>Cell respawn timers count down by <const>1</const>.</li>
        <!-- END -->
        <li>For each flying drone: re-orthonormalise <var>f</var> then <var>u</var> (Gram-Schmidt).</li>
        <!-- BEGIN level2 level3 level4 -->
        <li>If it is in a CRASH and <var>z</var> &le; <const>500</const> (bottom within <const>300</const> of the
          floor), the CRASH ends.</li>
        <li>If its motors are stopped (CRASH or empty battery): <var>w</var> = <const>0</const>, THROTTLE counts as
          <const>0</const>, <var>cutout</var> counts down by <const>1</const>, and it skips to the thrust step.</li>
        <!-- END -->
        <!-- BEGIN level1 -->
        <li>If its motors are stopped (empty battery): <var>w</var> = <const>0</const>, THROTTLE counts as
          <const>0</const>, and it skips to the thrust step.</li>
        <!-- END -->
        <li>ANGLE rotation: heading = the direction of <var>f</var> seen from above (if <var>f</var> is vertical:
          of <var>u</var> when the nose points down, of &minus;<var>u</var> when it points up), turned right by
          YAW&middot;<const>15°</const>/<const>100</const>. Target: level, facing the heading; pitch the nose down
          by PITCH&middot;<const>60°</const>/<const>100</const>; then tilt <var>u</var> to the right by
          ROLL&middot;<const>60°</const>/<const>100</const> (forward unchanged), so full pitch and roll together lean
          about <const>75°</const>. Let <var>a</var> be the angle of the shortest rotation to the target. Wanted
          rotation: that rotation, scaled to the angle min(<var>a</var>, <const>20°</const>, &radic;(2 &times;
          <const>12°</const> &times; <var>a</var>)) (in radians). <var>w</var> moves towards the wanted rotation by
          at most <const>12°</const>, and the drone rotates by the vector <var>w</var>.</li>
        <li>ACRO rotation: <var>W</var> = (<const>30°</const> &times; (&minus;PITCH&middot;right +
          ROLL&middot;forward) &minus; <const>15°</const> &times; YAW&middot;up) / <const>100</const>; <var>w</var> += <const>0.2</const>
          &times; (<var>W</var> &minus; <var>w</var>); the drone rotates by the vector <var>w</var>.</li>
        <!-- BEGIN level3 level4 -->
        <li><action>USE</action>: the held item starts.</li>
        <!-- END -->
        <!-- BEGIN level2 level3 level4 -->
        <li><action>BOOST</action>: <var>v</var> += <const>300</const>&middot;<var>u</var>.</li>
        <!-- END -->
        <!-- BEGIN level1 -->
        <li>Thrust: <var>v</var> += <var>u</var>&middot;<const>50</const>&middot;THROTTLE/<const>100</const>
          &minus; (<const>0</const>, <const>0</const>, <const>20</const>). Gravity always applies.</li>
        <!-- END -->
        <!-- BEGIN level2 level3 -->
        <li>Thrust: <var>v</var> += <var>u</var>&middot;(<const>50</const> &minus; min(<const>20</const>,
          <var>damage</var>))&middot;THROTTLE/<const>100</const> &minus; (<const>0</const>, <const>0</const>,
          <const>20</const>). Gravity always applies.</li>
        <!-- END -->
        <!-- BEGIN level4 -->
        <li>Thrust: <var>v</var> += <var>u</var>&middot;<const>2</const>&middot;(<const>50</const> &minus;
          min(<const>20</const>, <var>damage</var>))&middot;THROTTLE/<const>100</const> &minus; (<const>0</const>,
          <const>0</const>, <const>20</const>). Gravity always applies.</li>
        <!-- END -->
        <!-- BEGIN level1 -->
        <li>All drones move together by <var>v</var> in straight lines. Collisions with walls, the ceiling, the floor and other
          drones are handled in time order. On a wall or the ceiling, the speed towards it is reversed and halved.
          Two drones collide only while they get closer and neither is a ghost; each drone's speed along the line
          between their centres changes by <const>0.9</const> &times; their closing speed (equal masses, the
          bounce keeps <const>80%</const> of the closing speed). A destroyed or finished drone stops.</li>
        <!-- END -->
        <!-- BEGIN level2 level3 -->
        <li>All drones move together by <var>v</var> in straight lines. Collisions with walls, the ceiling, the floor and other
          drones are handled in time order. On a wall or the ceiling, the impact speed is your speed towards it; that
          part of the speed is reversed and halved. Two drones collide only while they get closer and neither is a
          ghost; the impact speed is their closing speed along the line between their centres, and each drone's speed
          along that line changes by <const>0.9</const> &times; the impact speed (equal masses, the bounce keeps
          <const>80%</const> of the closing speed). A destroyed or finished drone stops.</li>
        <!-- END -->
        <!-- BEGIN level4 -->
        <li>All drones move together by <var>v</var> in straight lines. Collisions with walls, the ceiling, the floor, other
          drones and pylons are handled in time order. On a wall or the ceiling, the impact speed is your speed towards
          it; that part of the speed is reversed and halved. Two drones collide only while they get closer and
          neither is a ghost; the impact speed is their closing speed along the line between their centres, and
          each drone's speed along that line changes by <const>0.9</const> &times; the impact speed (equal masses,
          the bounce keeps <const>80%</const> of the closing speed). A drone hits a pylon when its centre comes
          within <const>200</const> + <var>radius</var> of the pylon's axis (horizontally) while getting closer; the
          impact speed is its speed towards the axis, and that part of the speed is reversed and halved. A
          destroyed or finished drone stops.</li>
        <!-- END -->
        <li>Rings are one-way: a drone in front of a ring (<var>n</var>&middot;(<var>p</var> &minus; <var>c</var>)
          &ge; <const>200</const>) moving backwards hits its inside when <var>n</var>&middot;(<var>p</var> &minus;
          <var>c</var>) reaches <const>200</const> with its centre less than R from the ring's axis. The impact speed
          is its speed along &minus;<var>n</var>; that part of the speed is reversed and halved, like a wall.</li>
        <li>Every ring is solid (not only your next gate, and also for a GHOST), in time order with the other
          collisions: a drone hits a ring when its centre comes within <const>200</const> + <const>40</const> of
          the ring's circle (radius R around the gate centre, in the gate's plane) while getting closer. The impact
          speed is its speed towards the nearest point of that circle; that part of the speed is reversed and
          halved. The referee finds that instant by stepping along the path by (distance &minus; <const>240</const>)
          / speed until within <const>0.000001</const> (at most <const>100</const> steps).</li>
        <li>The move is resolved one event at a time: all drones advance to the earliest event, which is applied,
          then the search starts again (at most <const>64</const> events per turn; if that is reached, all drones
          move for the rest of the turn without collisions, stopped at the walls, floor and ceiling). A drone on the
          floor never gets a downward speed from a ring. Ties go to the first found:
          per drone in id order the floor, <var>x</var> walls, <var>y</var> walls, the ceiling, then pylons, rings,
          then drone pairs.</li>
        <!-- BEGIN level2 level3 level4 -->
        <li>CRASH: an impact at speed <var>s</var> stops the motors for min(<const>10</const>,
          floor(<var>s</var> / <const>50</const>)) turns: <var>damage</var> += max(<const>0</const>, k &minus;
          <var>cutout</var>), then <var>cutout</var> = max(<var>cutout</var>, k), with k that number of turns.
          <var>damage</var> starts at <const>0</const> and is not in the input: track it from the jumps of
          <var>cutout</var>.
          <!-- BEGIN level3 level4 -->
          A drone with a SHIELD does not CRASH, and neither does a drone it hits.
          <!-- END -->
        </li>
        <!-- END -->
        <li>Gate: along each straight piece of the move, with <var>d</var> = <var>n</var>&middot;(<var>p</var>
          &minus; <var>c</var>) for your next gate: if you have entered it and <var>d</var> &lt; <const>0</const>, the
          entry is cancelled; if you have not and <var>d</var> goes from &lt; <const>0</const> to &ge;
          <const>0</const>, crossing the plane less than R from the gate centre, you enter it; once entered, the gate
          is cleared when <var>d</var> &ge; <const>200</const>. The entry is not in the input: your bot can tell it
          from your positions.</li>
        <!-- BEGIN level1 -->
        <li>Floor: a drone whose centre reaches <var>z</var> = <const>200</const> stops there with no vertical
          speed; it is destroyed if its motors were stopped at the start of the turn or it falls faster than
          <const>150</const>.</li>
        <!-- END -->
        <!-- BEGIN level2 level3 level4 -->
        <li>Floor: a drone whose centre reaches <var>z</var> = <const>200</const> stops there with no vertical
          speed; it is destroyed if its motors were stopped at the start of the turn, if <var>cutout</var> &gt;
          <const>0</const> (a CRASH earlier in this move counts), or if it falls faster than <const>150</const>.</li>
        <!-- END -->
        <!-- BEGIN level1 level2 -->
        <li>Only your next gate can be cleared: flying through any other ring does not count (all rings are still
          solid).</li>
        <!-- END -->
        <!-- BEGIN level3 level4 -->
        <li>Only your next gate can be cleared: flying through any other ring does not count (all rings are still
          solid). Cells are picked up along the move too.</li>
        <!-- END -->
        <li>Slipstream, from the speeds after the move: you are in the slipstream of another flying drone moving
          at <const>100</const> or more if you are at most <const>1500</const> behind it along its speed and
          within <const>300</const> of that line. Drag is then <const>0.9725</const>, otherwise
          <const>0.97</const>: <var>v</var> &times;= drag.</li>
        <li>Rounding: position and speed to <const>0.01</const>, <var>f</var>, <var>u</var> and <var>w</var> to
          <const>0.000001</const>, as floor(<var>x</var> &times; <var>s</var> + <const>0.5</const>) /
          <var>s</var>.</li>
        <!-- BEGIN level2 level3 level4 -->
        <li>Boosts: a <action>BOOST</action> takes <const>40</const> turns to restore. Using one at your starting
          number starts a cycle (<var>boostTimer</var> = <const>40</const>). While you are below your starting
          number, <var>boostTimer</var> counts down here; once a cycle completes (<var>boostTimer</var> =
          <const>0</const>), one boost is restored, and another cycle begins until the starting number is
          restored.</li>
        <!-- END -->
        <li>Battery: <const>100</const> if a gate was cleared this turn, otherwise reduced by <const>1</const>.</li>
        <!-- BEGIN level3 level4 -->
        <li><var>shield</var> and <var>ghost</var> count down. Then you collect the cells you reached this turn: a
          <const>CHARGE</const> adds its boost at once, and if it brings you to your starting number or above it
          sets <var>boostTimer</var> to <const>0</const>; a <const>SHIELD</const> or <const>GHOST</const> becomes
          your held <var>item</var> if you hold none, and only takes effect when you output
          <action>USE</action>.</li>
        <!-- END -->
      </ol>
      <p>The values you read are the exact game state. The referee's source code is on <a href="https://github.com/francoisbeaussier/cg-topgate-referee" target="_blank" rel="noopener">GitHub</a>.</p>
    </div>
  </div>
  <!-- BEGIN level1 level2 level3 -->
  <div style="color: #7cc576; background-color: rgba(124, 197, 118,.1); padding: 20px; margin-right: 15px; margin-left: 15px; margin-top: 10px; text-align: left;">
    <div style="text-align: center; margin-bottom: 6px"><img src="//cdn.codingame.com/smash-the-code/statement/league_wood_04.png" /></div>
    <p style="text-align: center; font-weight: 700; margin-bottom: 6px;">What is in store for me in the higher leagues?</p>
    <div class="statement-league-alert-content">
      The extra rules available in higher leagues are:
      <ul>
        <!-- BEGIN level1 -->
        <li><strong>Wood 3</strong>: impacts CRASH drones (motors off, longer for harder hits) and damage them, a <action>BOOST</action>, smaller gates, and tracks with ladders and hairpins.</li>
        <!-- END -->
        <!-- BEGIN level1 level2 -->
        <li><strong>Wood 2</strong>: power cells beside the track: <const>CHARGE</const> (an extra boost), <const>SHIELD</const>
          (no crashes) and <const>GHOST</const> (fly through drones), the last two kept until you
          <action>USE</action> them.</li>
        <!-- END -->
        <!-- BEGIN level1 level2 level3 -->
        <li><strong>Wood 1</strong>: twice as powerful drones, pylons (columns from the floor to the ceiling that you must
          fly around), and <const>3</const> boosts.</li>
        <!-- END -->
      </ul>
    </div>
  </div>
  <!-- END -->
</div>
