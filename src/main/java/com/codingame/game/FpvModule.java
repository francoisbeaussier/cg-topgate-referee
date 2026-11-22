package com.codingame.game;

import com.codingame.gameengine.core.AbstractPlayer;
import com.codingame.gameengine.core.GameManager;
import com.codingame.gameengine.core.Module;
import com.google.inject.Inject;
import com.google.inject.Singleton;
import topgate.sim.Command;
import topgate.sim.Drone;
import topgate.sim.Game;
import topgate.sim.Rules;
import topgate.sim.Vec3;

@Singleton
public class FpvModule implements Module {
    private final GameManager<AbstractPlayer> gm;
    private Game game;
    private Command[] cmds;

    @Inject
    FpvModule(GameManager<AbstractPlayer> gm) {
        this.gm = gm;
        gm.registerModule(this);
    }

    public void init(Game game, int bankMs) {
        this.game = game;
        int[][] gates = new int[game.track.size()][];
        for (int i = 0; i < gates.length; i++) {
            Vec3 c = game.track.c[i], n = game.track.n[i];
            gates[i] = new int[]{(int) c.x(), (int) c.y(), (int) c.z(), k(n.x()), k(n.y()), k(n.z())};
        }
        java.util.Map<String, Object> g = new java.util.HashMap<>();
        g.put("gates", gates);
        g.put("arena", new int[]{(int) Rules.X, (int) Rules.Y, (int) Rules.Z});
        g.put("r", new int[]{(int) game.rules.gateR(), (int) game.rules.gateR() + 100, (int) Rules.RADIUS});
        g.put("laps", Rules.LAPS);
        g.put("bank", bankMs);
        g.put("boosts", game.rules.boosts());
        g.put("recharge", Rules.BOOST_RECHARGE);
        int[][] cells = new int[game.cellPos.length][];
        for (int i = 0; i < cells.length; i++)
            cells[i] = new int[]{(int) game.cellPos[i].x(), (int) game.cellPos[i].y(), (int) game.cellPos[i].z(), game.cellType[i]};
        g.put("cells", cells);
        int[][] pylons = new int[game.pylons.length][];
        for (int i = 0; i < pylons.length; i++)
            pylons[i] = new int[]{(int) game.pylons[i][0], (int) game.pylons[i][1], (int) game.pylons[i][2]};
        g.put("pylons", pylons);
        g.put("t", new int[]{(int) Rules.TRIM_X, (int) Rules.TRIM_Y, (int) Rules.TRIM_Z, (int) Rules.TRIM_R});
        g.put("k", Rules.TRIM_TABLE);
        g.put("d0", frame());
        gm.setViewGlobalData("fpv", g);
    }

    public void setCommands(Command[] cmds) { this.cmds = cmds; }

    private int[] bank;

    public void setBank(int[] bank) { this.bank = bank; }

    private static int k(double x) { return (int) Math.round(x * 1000); }

    private java.util.Map<String, Object> frame() {
        int[][] out = new int[game.drones.length][];
        int[] pos = game.positions();
        for (Drone d : game.drones) {
            Command c = cmds == null ? null : cmds[d.id];
            out[d.id] = new int[]{(int) Math.round(d.p.x()), (int) Math.round(d.p.y()), (int) Math.round(d.p.z()),
                    k(d.f.x()), k(d.f.y()), k(d.f.z()), k(d.u.x()), k(d.u.y()), k(d.u.z()),
                    (int) Math.round(d.v.len()), d.nextGate, d.lap, d.battery, d.boosts, d.cutout, d.state,
                    c == null ? 0 : c.throttle(), c == null ? 0 : c.yaw(), c == null ? 0 : c.pitch(), c == null ? 0 : c.roll(),
                    d.mode, pos[d.id], d.shield, d.ghost, d.cam, d.item,
                    d.lastBoostTurn == game.turn ? 1 : 0, d.boostTimer, d.lastCellCharge == game.turn ? 1 : 0, d.draft ? 1 : 0,
                    d.trimTurn < 0 ? 0 : d.trimTurn == game.turn ? 2 : 1, bank == null ? -1 : bank[d.id], d.crashTurns};
        }
        java.util.Map<String, Object> m = new java.util.HashMap<>();
        m.put("d", out);
        m.put("c", game.cellTimer);
        int[][] ev = new int[game.events.size()][];
        for (int k = 0; k < ev.length; k++) {
            double[] e = game.events.get(k);
            ev[k] = new int[e.length];
            for (int q = 0; q < e.length; q++) ev[k][q] = (int) Math.round(q == 2 ? e[q] * 1000 : e[q]);
        }
        m.put("e", ev);
        return m;
    }

    @Override
    public void onGameInit() {
    }

    @Override
    public void onAfterGameTurn() {
        gm.setViewData("fpv", frame());
    }

    @Override
    public void onAfterOnEnd() {
    }
}
