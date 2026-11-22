package topgate.sim;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class Game {
    public final Rules rules;
    public final Track track;
    public final Drone[] drones;
    public int turn;
    public Vec3[] cellPos = new Vec3[0];
    public int[] cellType = new int[0], cellTimer = new int[0];
    public double[][] pylons = new double[0][];

    public Game(Rules rules, int players, long seed) {
        this.rules = rules;
        Rng rng = new Rng(seed);
        Track custom = Track.custom(), scen = rules.league() >= 3 ? Track.scenario(seed) : null;
        track = custom != null ? custom : scen != null ? scen : Track.generate(rng, rules.league(), rules.margin(), rules.spacing());
        int[] slot = new int[players];
        for (int i = 0; i < players; i++) slot[i] = i;
        for (int i = players - 1; i > 0; i--) {
            int j = rng.nextInt(i + 1);
            int t = slot[i]; slot[i] = slot[j]; slot[j] = t;
        }
        Vec3 g1 = track.c[1];
        double[] st = startGrid(players, true);
        if (st == null) st = startGrid(players, false);
        double rad = st[0], base = st[1], spacing = st[2];
        drones = new Drone[players];
        for (int i = 0; i < players; i++) {
            double a = base + (slot[i] - (players - 1) / 2.0) * spacing / rad;
            Vec3 p = new Vec3(g1.x() + rad * Math.cos(a), g1.y() + rad * Math.sin(a), Rules.RADIUS).round(100);
            Vec3 f = new Vec3(g1.x() - p.x(), g1.y() - p.y(), 0).norm().round(1e6);
            drones[i] = new Drone(i, p, f);
            drones[i].slot = slot[i];
            drones[i].boosts = rules.boosts();
            if (rules.collisions() != Rules.NONE) drones[i].ghost = Rules.START_GHOST;
        }
        if (rules.cells() && scen == null) placeCells(rng);
        if (rules.pylons() && scen == null) placePylons(rng);
    }

    private void placePylons(Rng rng) {
        int n = track.size();
        int want = 2 + rng.nextInt(3);
        List<double[]> out = new ArrayList<>();
        for (int attempt = 0; attempt < 200 && out.size() < want; attempt++) {
            int leg = rng.nextInt(n);
            Vec3 a = track.c[leg], b = track.c[(leg + 1) % n];
            double hx = b.x() - a.x(), hy = b.y() - a.y(), hl = Math.hypot(hx, hy);
            if (hl < Rules.PYLON_MIN_LEG) continue;
            double t = rng.range(35, 65) / 100.0, off = rng.range(-500, 500), r = Math.round(rng.range(Rules.PYLON_MIN_R, Rules.PYLON_MAX_R));
            double x = Math.round(a.x() + hx * t - hy / hl * off), y = Math.round(a.y() + hy * t + hx / hl * off);
            if (pylonFits(x, y, r, out)) out.add(new double[]{x, y, r});
        }
        pylons = out.toArray(new double[0][]);
    }

    private boolean pylonFits(double x, double y, double r, List<double[]> placed) {
        double m = Rules.PYLON_WALL + r;
        if (x < m || x > Rules.X - m || y < m || y > Rules.Y - m) return false;
        for (Vec3 c : track.c) if (Math.hypot(c.x() - x, c.y() - y) < Rules.PYLON_GATE_CLEAR + r) return false;
        if (Math.hypot(Rules.TRIM_X - x, Rules.TRIM_Y - y) < Rules.TRIM_R + r + 1000) return false;
        for (Drone d : drones) if (Math.hypot(d.p.x() - x, d.p.y() - y) < Rules.PYLON_START_CLEAR + r) return false;
        for (Vec3 c : cellPos) if (Math.hypot(c.x() - x, c.y() - y) < Rules.CELL_PICK + Rules.RADIUS + r) return false;
        for (double[] q : placed) if (Math.hypot(q[0] - x, q[1] - y) < q[2] + r + 1500) return false;
        return true;
    }

    private void placeCells(Rng rng) {
        int n = track.size();
        int[] legs = new int[n];
        for (int i = 0; i < n; i++) legs[i] = i;
        for (int i = n - 1; i > 0; i--) {
            int j = rng.nextInt(i + 1);
            int t = legs[i]; legs[i] = legs[j]; legs[j] = t;
        }
        List<Vec3> pos = new ArrayList<>();
        for (int k = 0; k < n && pos.size() < 3; k++) {
            Vec3 a = track.c[legs[k]], b = track.c[(legs[k] + 1) % n];
            Vec3 d = new Vec3(b.x() - a.x(), b.y() - a.y(), 0);
            if (d.len() < 2500) continue;
            d = d.norm();
            Vec3 mid = a.add(b).mul(0.5);
            double off = rng.range(800, 1400) * (rng.nextInt(2) == 0 ? 1 : -1);
            double z = mid.z() + rng.range(-300, 300);
            double x = mid.x() - d.y() * off, y = mid.y() + d.x() * off;
            pos.add(new Vec3(Math.max(800, Math.min(Rules.X - 800, x)), Math.max(800, Math.min(Rules.Y - 800, y)),
                    Math.max(500, Math.min(4200, z))).round(1));
        }
        cellPos = pos.toArray(new Vec3[0]);
        cellType = new int[cellPos.length];
        cellTimer = new int[cellPos.length];
        for (int i = 0; i < cellType.length; i++) cellType[i] = i;
    }

    private double[] startGrid(int players, boolean strict) {
        Vec3 g1 = track.c[1], n0 = track.n[0], c0 = track.c[0];
        Vec3 h0 = new Vec3(n0.x(), n0.y(), 0);
        Vec3 hn = h0.len() > 1e-6 ? h0.norm() : new Vec3(c0.x() - g1.x(), c0.y() - g1.y(), 0).norm();
        double ahead = Math.max(Rules.START_AHEAD, (Rules.START_AHEAD - n0.z() * (Rules.RADIUS - c0.z())) / Math.max(0.2, h0.len()));
        for (int step = 0; step < (strict ? 12 : 1); step++) {
            Vec3 a = c0.add(hn.mul(ahead + 400 * step));
            Vec3 g0 = new Vec3(Math.max(500, Math.min(Rules.X - 500, a.x())), Math.max(500, Math.min(Rules.Y - 500, a.y())), c0.z()).round(1);
            double dx = g0.x() - g1.x(), dy = g0.y() - g1.y(), rad = Math.hypot(dx, dy), base = Math.atan2(dy, dx);
            if (rad < 1) continue;
            for (double spacing = Rules.START_SPACING; spacing >= 0; spacing -= 50)
                if (startFits(g1, rad, base, players, spacing, strict)) return new double[]{rad, base, spacing};
            if (!strict) return new double[]{rad, base, 0};
        }
        return null;
    }

    private boolean startFits(Vec3 g1, double rad, double base, int players, double spacing, boolean strict) {
        for (int k = 0; k < players; k++) {
            double a = base + (k - (players - 1) / 2.0) * spacing / rad;
            double x = g1.x() + rad * Math.cos(a), y = g1.y() + rad * Math.sin(a);
            if (x < 500 || x > Rules.X - 500 || y < 500 || y > Rules.Y - 500) return false;
            if (!strict) continue;
            Vec3 p = new Vec3(x, y, Rules.RADIUS);
            if (track.n[0].dot(p.sub(track.c[0])) < Rules.RADIUS + 50) return false;
            for (int g = 0; g < track.size(); g++)
                if (ringDist(p, track.c[g], track.n[g], rules.gateR()) < Rules.RADIUS + Rules.RING_TUBE + 60) return false;
        }
        return true;
    }

    public Game(Rules rules, Track track, Drone[] drones) {
        this.rules = rules;
        this.track = track;
        this.drones = drones;
    }

    public boolean over() {
        if (turn >= Rules.MAX_TURNS) return true;
        int flying = 0;
        Drone last = null;
        for (Drone d : drones) {
            if (d.state == Drone.FINISHED) return true;
            if (d.active()) { flying++; last = d; }
        }
        if (flying == 0) return true;
        if (flying > 1 || drones.length < 2) return false;
        for (Drone d : drones) if (d != last && d.gatesCleared >= last.gatesCleared) return false;
        return true;
    }

    public void step(Command[] cmds) {
        turn++;
        events.clear();
        for (int i = 0; i < cellTimer.length; i++) if (cellTimer[i] > 0) cellTimer[i]--;
        for (Drone d : drones) {
            if (!d.active()) continue;
            Command c = cmds[d.id];
            if (d.mode == 0) d.mode = c.mode();
            if (c.cam() >= 0) d.cam = c.cam();
            orthonormalize(d);
            if (d.cutout > 0 && d.p.z() - Rules.RADIUS <= Rules.RESTART_HEIGHT) d.cutout = 0;
            d.motorsOff = d.cutout > 0 || d.battery <= 0;
            double thrust = 0;
            if (d.motorsOff) {
                d.w = Vec3.ZERO;
                if (d.cutout > 0) d.cutout--;
            } else {
                if (d.mode == Command.ACRO) acro(d, c);
                else angle(d, c);
                thrust = c.throttle() / 100.0 * rules.thrust() / Rules.THRUST * (Rules.THRUST - Math.min(Rules.DAMAGE_MAX, d.crashTurns));
                if (c.use() && d.item != 0) {
                    if (d.item == Rules.SHIELD) d.shield = Rules.SHIELD_TURNS;
                    else d.ghost = Rules.GHOST_TURNS;
                    d.item = 0;
                }
                if (c.boost() && d.boosts > 0) {
                    d.v = d.v.add(d.u.mul(Rules.BOOST));
                    d.lastBoostTurn = turn;
                    if (d.boosts == rules.boosts()) d.boostTimer = Rules.BOOST_RECHARGE;
                    d.boosts--;
                }
            }
            d.v = d.v.add(d.u.mul(thrust)).add(new Vec3(0, 0, -Rules.G));
        }
        int[] cleared = new int[drones.length];
        pickT = new double[cellPos.length];
        java.util.Arrays.fill(pickT, Double.MAX_VALUE);
        pickBy = new boolean[cellPos.length][drones.length];
        move(cleared);
        for (Drone d : drones) d.draft = rules.draft() && d.active() && drafting(d);
        for (Drone d : drones) {
            if (!d.active() && d.endTurn != turn) continue;
            if (d.state == Drone.DESTROYED) continue;
            d.v = d.v.mul(d.draft ? Rules.DRAFT_DRAG : Rules.DRAG).round(100);
            d.p = d.p.round(100);
            d.f = d.f.round(1e6);
            d.u = d.u.round(1e6);
            d.w = d.w.round(1e6);
            if (d.boosts < rules.boosts() && --d.boostTimer <= 0) {
                d.boosts++;
                d.boostTimer = d.boosts < rules.boosts() ? Rules.BOOST_RECHARGE : 0;
            }
            d.battery = cleared[d.id] > 0 ? Rules.BATTERY : Math.max(0, d.battery - 1);
            if (d.shield > 0) d.shield--;
            if (d.ghost > 0) d.ghost--;
        }
        Integer[] order = new Integer[cellPos.length];
        for (int k = 0; k < order.length; k++) order[k] = k;
        java.util.Arrays.sort(order, (x, y) -> Double.compare(pickT[x], pickT[y]));
        for (int k : order) {
            if (pickT[k] == Double.MAX_VALUE) continue;
            boolean taken = false;
            for (Drone d : drones) {
                if (!pickBy[k][d.id] || d.state == Drone.DESTROYED) continue;
                if (cellType[k] == Rules.CHARGE) {
                    d.boosts++;
                    d.lastCellCharge = turn;
                    if (d.boosts >= rules.boosts()) d.boostTimer = 0;
                    taken = true;
                } else if (d.item == 0) {
                    d.item = cellType[k];
                    taken = true;
                }
            }
            if (taken) cellTimer[k] = Rules.CELL_RESPAWN;
        }
        if (over()) for (Drone d : drones) if (d.active()) d.endDist = distNext(d);
    }

    private boolean drafting(Drone d) {
        for (Drone o : drones) {
            if (o == d || !o.active()) continue;
            double sp = o.v.len();
            if (sp < 100) continue;
            Vec3 back = o.v.mul(-1 / sp), rel = d.p.sub(o.p);
            double along = rel.dot(back);
            if (along <= 0 || along > Rules.DRAFT_LEN) continue;
            if (rel.sub(back.mul(along)).len() <= Rules.DRAFT_W) return true;
        }
        return false;
    }

    private static void orthonormalize(Drone d) {
        d.f = d.f.norm();
        d.u = d.u.sub(d.f.mul(d.u.dot(d.f))).norm();
    }

    private static void spin(Drone d, Vec3 w) {
        double a = w.len();
        if (a == 0) return;
        Vec3 k = w.mul(1 / a);
        d.f = d.f.rot(k, a);
        d.u = d.u.rot(k, a);
    }

    private static void acro(Drone d, Command c) {
        Vec3 r = d.f.cross(d.u);
        Vec3 w = r.mul(-c.pitch() / 100.0 * Rules.ACRO_RATE)
                .add(d.f.mul(c.roll() / 100.0 * Rules.ACRO_RATE))
                .add(d.u.mul(-c.yaw() / 100.0 * Rules.ACRO_YAW));
        d.w = d.w.add(w.sub(d.w).mul(Rules.SPIN_UP));
        spin(d, d.w);
    }

    private static void angle(Drone d, Command c) {
        Vec3 hf = new Vec3(d.f.x(), d.f.y(), 0);
        if (hf.len() < 1e-6) hf = new Vec3(d.u.x(), d.u.y(), 0).mul(d.f.z() > 0 ? -1 : 1);
        double psi = hf.len() < 1e-6 ? 0 : Math.atan2(hf.y(), hf.x());
        psi -= c.yaw() / 100.0 * Rules.ANGLE_YAW;
        Vec3 f0 = new Vec3(Math.cos(psi), Math.sin(psi), 0), u0 = Vec3.UP, r0 = f0.cross(u0);
        double th = c.pitch() / 100.0 * Rules.MAX_TILT, ph = c.roll() / 100.0 * Rules.MAX_TILT;
        Vec3 f1 = f0.mul(Math.cos(th)).sub(u0.mul(Math.sin(th)));
        Vec3 u1 = u0.mul(Math.cos(th)).add(f0.mul(Math.sin(th)));
        Vec3 u2 = u1.mul(Math.cos(ph)).add(r0.mul(Math.sin(ph)));
        double[] qc = quat(d.f, d.u), qt = quat(f1, u2);
        double w = qt[0] * qc[0] + qt[1] * qc[1] + qt[2] * qc[2] + qt[3] * qc[3];
        double x = -qt[0] * qc[1] + qt[1] * qc[0] - qt[2] * qc[3] + qt[3] * qc[2];
        double y = -qt[0] * qc[2] + qt[1] * qc[3] + qt[2] * qc[0] - qt[3] * qc[1];
        double z = -qt[0] * qc[3] - qt[1] * qc[2] + qt[2] * qc[1] + qt[3] * qc[0];
        if (w < 0) { w = -w; x = -x; y = -y; z = -z; }
        double s = Math.sqrt(x * x + y * y + z * z);
        double a = 2 * Math.atan2(s, w);
        double acc = Rules.ANGLE_ACC;
        double want = Math.min(Math.min(Rules.SLEW, Math.sqrt(2 * acc * a)), a);
        Vec3 wd = s == 0 ? Vec3.ZERO : new Vec3(x, y, z).mul(want / s);
        Vec3 dw = wd.sub(d.w);
        if (dw.len() > acc) dw = dw.mul(acc / dw.len());
        d.w = d.w.add(dw);
        spin(d, d.w);
    }

    private static double[] quat(Vec3 f, Vec3 u) {
        Vec3 l = u.cross(f);
        double m00 = f.x(), m01 = l.x(), m02 = u.x(), m10 = f.y(), m11 = l.y(), m12 = u.y(), m20 = f.z(), m21 = l.z(), m22 = u.z();
        double tr = m00 + m11 + m22, s;
        if (tr > 0) {
            s = Math.sqrt(tr + 1) * 2;
            return new double[]{s / 4, (m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s};
        } else if (m00 > m11 && m00 > m22) {
            s = Math.sqrt(1 + m00 - m11 - m22) * 2;
            return new double[]{(m21 - m12) / s, s / 4, (m01 + m10) / s, (m02 + m20) / s};
        } else if (m11 > m22) {
            s = Math.sqrt(1 + m11 - m00 - m22) * 2;
            return new double[]{(m02 - m20) / s, (m01 + m10) / s, s / 4, (m12 + m21) / s};
        } else {
            s = Math.sqrt(1 + m22 - m00 - m11) * 2;
            return new double[]{(m10 - m01) / s, (m02 + m20) / s, (m12 + m21) / s, s / 4};
        }
    }

    private void move(int[] cleared) {
        double t = 0;
        double R = Rules.RADIUS;
        for (int guard = 0; t < 1 && guard < 64; guard++) {
            double best = 1 - t;
            int type = -1, a = -1, b = -1;
            for (Drone d : drones) {
                if (!d.active()) continue;
                double[] tt = {
                        d.v.z() < 0 ? (d.p.z() - R) / -d.v.z() : 2,
                        d.v.x() < 0 ? (d.p.x() - R) / -d.v.x() : d.v.x() > 0 ? (Rules.X - R - d.p.x()) / d.v.x() : 2,
                        d.v.y() < 0 ? (d.p.y() - R) / -d.v.y() : d.v.y() > 0 ? (Rules.Y - R - d.p.y()) / d.v.y() : 2,
                        d.v.z() > 0 ? (Rules.Z - R - d.p.z()) / d.v.z() : 2};
                for (int k = 0; k < 4; k++) {
                    double x = Math.max(0, tt[k]);
                    if (x < best) { best = x; type = k; a = d.id; }
                }
            }
            for (Drone d : drones) {
                if (!d.active()) continue;
                for (int k = 0; k < pylons.length; k++) {
                    double qx = d.p.x() - pylons[k][0], qy = d.p.y() - pylons[k][1], vx = d.v.x(), vy = d.v.y();
                    double bq = qx * vx + qy * vy;
                    if (bq >= 0) continue;
                    double rr = pylons[k][2] + R, aq = vx * vx + vy * vy, cq = qx * qx + qy * qy - rr * rr, x;
                    if (cq <= 0) x = 0;
                    else {
                        double disc = bq * bq - aq * cq;
                        if (disc < 0) continue;
                        x = (-bq - Math.sqrt(disc)) / aq;
                    }
                    if (x < best) { best = x; type = 5; a = d.id; b = k; }
                }
                for (int k = 0; k < track.size(); k++) {
                    double x = ringHit(d.p, d.v, track.c[k], track.n[k], rules.gateR(), best);
                    if (x >= 0 && x < best) { best = x; type = 6; a = d.id; b = k; }
                    double y = backHit(d.p, d.v, track.c[k], track.n[k], rules.gateR());
                    if (y >= 0 && y < best) { best = y; type = 7; a = d.id; b = k; }
                }
            }
            if (rules.collisions() != Rules.NONE) {
                for (int i = 0; i < drones.length; i++) {
                    if (!drones[i].active()) continue;
                    if (drones[i].ghost > 0) continue;
                    for (int j = i + 1; j < drones.length; j++) {
                        if (!drones[j].active() || drones[j].ghost > 0) continue;
                        Vec3 dp = drones[j].p.sub(drones[i].p), dv = drones[j].v.sub(drones[i].v);
                        double bq = dp.dot(dv);
                        if (bq >= 0) continue;
                        double aq = dv.dot(dv), cq = dp.dot(dp) - 4 * R * R, x;
                        if (cq <= 0) x = 0;
                        else {
                            double disc = bq * bq - aq * cq;
                            if (disc < 0) continue;
                            x = (-bq - Math.sqrt(disc)) / aq;
                        }
                        if (x < best) { best = x; type = 4; a = i; b = j; }
                    }
                }
            }
            for (Drone d : drones) {
                if (!d.active()) continue;
                Vec3 p0 = d.p;
                d.p = d.p.add(d.v.mul(best));
                gate(d, p0, cleared);
                trim(d, p0);
                pick(d, p0, t, best);
            }
            t += best;
            if (type < 0) break;
            if (type == 4) collide(drones[a], drones[b], t);
            else if (type == 5) pylon(drones[a], pylons[b], t);
            else if (type == 0) floor(drones[a]);
            else if (type == 6) ring(drones[a], b, t);
            else if (type == 7) back(drones[a], b, t);
            else wall(drones[a], type, t);
        }
        if (t < 1) {
            double rest = 1 - t;
            for (Drone d : drones) {
                if (!d.active()) continue;
                Vec3 p0 = d.p;
                d.p = d.p.add(d.v.mul(rest));
                gate(d, p0, cleared);
                trim(d, p0);
                pick(d, p0, t, rest);
                double x = Math.max(R, Math.min(Rules.X - R, d.p.x())), y = Math.max(R, Math.min(Rules.Y - R, d.p.y()));
                double z = Math.max(R, Math.min(Rules.Z - R, d.p.z()));
                d.p = new Vec3(x, y, z);
                if (z <= R && d.v.z() < 0) d.v = new Vec3(d.v.x(), d.v.y(), 0);
            }
        }
    }

    private void pylon(Drone d, double[] q, double at) {
        Vec3 n = new Vec3(d.p.x() - q[0], d.p.y() - q[1], 0).norm();
        double s = -d.v.dot(n);
        d.contacts[6]++;
        d.contacts[7] += s;
        d.v = d.v.add(n.mul((1 + Rules.RESTITUTION) * s));
        boolean crash = crash(d, s);
        Vec3 c = new Vec3(q[0], q[1], d.p.z()).add(n.mul(q[2]));
        events.add(new double[]{d.id, -1, at, d.p.x(), d.p.y(), d.p.z(), c.x(), c.y(), c.z(), s, crash ? 1 : 0});
    }

    public static double ringDist(Vec3 p, Vec3 c, Vec3 n, double r) {
        Vec3 q = p.sub(c);
        double h = q.dot(n), rho = q.sub(n.mul(h)).len();
        return Math.sqrt((rho - r) * (rho - r) + h * h);
    }

    public static Vec3 ringPoint(Vec3 p, Vec3 c, Vec3 n, double r) {
        Vec3 q = p.sub(c), rad = q.sub(n.mul(q.dot(n)));
        double rho = rad.len();
        return rho < 1e-9 ? c : c.add(rad.mul(r / rho));
    }

    public static double ringHit(Vec3 p, Vec3 v, Vec3 c, Vec3 n, double r, double maxT) {
        double lim = Rules.RADIUS + Rules.RING_TUBE, sp = v.len();
        if (p.sub(c).len() - sp * maxT > r + lim) return -1;
        double t = 0;
        for (int it = 0; it < 100; it++) {
            Vec3 q = p.add(v.mul(t));
            double f = ringDist(q, c, n, r) - lim;
            if (f < 1e-6) return v.dot(q.sub(ringPoint(q, c, n, r))) < 0 ? t : -1;
            if (sp == 0) return -1;
            t += f / sp;
            if (t >= maxT) return -1;
        }
        return -1;
    }

    public static double backHit(Vec3 p, Vec3 v, Vec3 c, Vec3 n, double r) {
        double d0 = n.dot(p.sub(c)), vn = n.dot(v);
        if (d0 < Rules.RADIUS || vn >= 0) return -1;
        double t = (d0 - Rules.RADIUS) / -vn;
        Vec3 rel = p.add(v.mul(t)).sub(c);
        return rel.sub(n.mul(n.dot(rel))).len() < r ? t : -1;
    }

    private void back(Drone d, int k, double at) {
        Vec3 n = track.n[k];
        double s = -d.v.dot(n);
        d.contacts[2]++;
        d.contacts[3] += s;
        d.v = d.v.add(n.mul((1 + Rules.RESTITUTION) * s));
        if (d.p.z() <= Rules.RADIUS + 1e-6 && d.v.z() < 0) d.v = new Vec3(d.v.x(), d.v.y(), 0);
        boolean crash = crash(d, s);
        Vec3 c = d.p.sub(n.mul(Rules.RADIUS));
        events.add(new double[]{d.id, -10 - k, at, d.p.x(), d.p.y(), d.p.z(), c.x(), c.y(), c.z(), s, crash ? 1 : 0});
    }

    private void ring(Drone d, int k, double at) {
        Vec3 cp = ringPoint(d.p, track.c[k], track.n[k], rules.gateR());
        Vec3 m = d.p.sub(cp).norm();
        double s = -d.v.dot(m);
        d.contacts[2]++;
        d.contacts[3] += s;
        d.v = d.v.add(m.mul((1 + Rules.RESTITUTION) * s));
        if (d.p.z() <= Rules.RADIUS + 1e-6 && d.v.z() < 0) d.v = new Vec3(d.v.x(), d.v.y(), 0);
        boolean crash = crash(d, s);
        Vec3 c = cp.add(m.mul(Rules.RING_TUBE));
        events.add(new double[]{d.id, -10 - k, at, d.p.x(), d.p.y(), d.p.z(), c.x(), c.y(), c.z(), s, crash ? 1 : 0});
    }

    private boolean crash(Drone d, double s) {
        if (rules.collisions() != Rules.CUTOUT || d.shield > 0) return false;
        int k = (int) Math.min(Rules.CRASH_MAX, Math.floor(s / Rules.CRASH_DIV));
        if (k <= 0) return false;
        d.crashTurns += Math.max(0, k - d.cutout);
        d.cutout = Math.max(d.cutout, k);
        d.cutouts++;
        return true;
    }

    private void floor(Drone d) {
        d.p = new Vec3(d.p.x(), d.p.y(), Rules.RADIUS);
        if (d.motorsOff || d.cutout > 0 || -d.v.z() > Rules.LAND_SPEED) {
            d.state = Drone.DESTROYED;
            d.endTurn = turn;
            d.endDist = distNext(d);
            d.v = Vec3.ZERO;
        } else d.v = new Vec3(d.v.x(), d.v.y(), 0);
    }

    private void wall(Drone d, int type, double at) {
        double s = Math.abs(type == 1 ? d.v.x() : type == 2 ? d.v.y() : d.v.z());
        int k = type == 3 ? 2 : 0;
        d.contacts[k]++;
        d.contacts[k + 1] += s;
        double e = Rules.RESTITUTION;
        if (type == 1) d.v = new Vec3(-e * d.v.x(), d.v.y(), d.v.z());
        else if (type == 2) d.v = new Vec3(d.v.x(), -e * d.v.y(), d.v.z());
        else d.v = new Vec3(d.v.x(), d.v.y(), -e * d.v.z());
        boolean crash = crash(d, s);
        Vec3 c = type == 1 ? new Vec3(d.p.x() < Rules.X / 2 ? 0 : Rules.X, d.p.y(), d.p.z())
                : type == 2 ? new Vec3(d.p.x(), d.p.y() < Rules.Y / 2 ? 0 : Rules.Y, d.p.z()) : new Vec3(d.p.x(), d.p.y(), Rules.Z);
        events.add(new double[]{d.id, -2, at, d.p.x(), d.p.y(), d.p.z(), c.x(), c.y(), c.z(), s, crash ? 1 : 0});
    }

    public final List<double[]> events = new ArrayList<>();

    private void collide(Drone a, Drone b, double at) {
        Vec3 pa = a.p, pb = b.p;
        Vec3 n = b.p.sub(a.p).norm();
        double s = a.v.sub(b.v).dot(n);
        a.contacts[4]++;
        b.contacts[4]++;
        a.contacts[5] += s;
        b.contacts[5] += s;
        double j = (1 + Rules.DRONE_RESTITUTION) / 2 * s;
        a.v = a.v.sub(n.mul(j));
        b.v = b.v.add(n.mul(j));
        boolean crash = a.shield == 0 && b.shield == 0 && crash(a, s);
        if (crash) crash(b, s);
        events.add(new double[]{a.id, b.id, at, pa.x(), pa.y(), pa.z(), pb.x(), pb.y(), pb.z(), s, crash ? 1 : 0});
    }

    private void gate(Drone d, Vec3 p0, int[] cleared) {
        int g = d.nextGate;
        Vec3 c = track.c[g], n = track.n[g];
        double d0 = n.dot(p0.sub(c)), d1 = n.dot(d.p.sub(c));
        if (d.entered && d1 < 0) d.entered = false;
        if (!d.entered && d0 < 0 && d1 >= 0) {
            Vec3 x = p0.add(d.p.sub(p0).mul(d0 / (d0 - d1)));
            if (x.sub(c).len() < rules.clearR()) d.entered = true;
        }
        if (!d.entered || d1 < Rules.RADIUS) return;
        d.entered = false;
        cleared[d.id]++;
        d.gatesCleared++;
        d.nextGate = (g + 1) % track.size();
        if (g == 0 && ++d.lap == Rules.LAPS) {
            d.state = Drone.FINISHED;
            d.endTurn = turn;
        }
    }

    private void trim(Drone d, Vec3 p0) {
        if (d.trimTurn >= 0) return;
        Vec3 c = new Vec3(Rules.TRIM_X, Rules.TRIM_Y, Rules.TRIM_Z), n = new Vec3(1, 1, 0).norm();
        double d0 = n.dot(p0.sub(c)), d1 = n.dot(d.p.sub(c));
        if (d0 == d1 || (d0 < 0) == (d1 < 0)) return;
        Vec3 x = p0.add(d.p.sub(p0).mul(d0 / (d0 - d1)));
        if (x.sub(c).len() < Rules.TRIM_R - Rules.RADIUS) d.trimTurn = turn;
    }

    private double[] pickT;
    private boolean[][] pickBy;

    private void pick(Drone d, Vec3 p0, double t0, double dt) {
        Vec3 seg = d.p.sub(p0);
        double l2 = seg.dot(seg);
        for (int k = 0; k < cellPos.length; k++) {
            if (cellTimer[k] > 0 || (cellType[k] != Rules.CHARGE && d.item != 0)) continue;
            double s = l2 == 0 ? 0 : Math.max(0, Math.min(1, cellPos[k].sub(p0).dot(seg) / l2));
            if (p0.add(seg.mul(s)).sub(cellPos[k]).len() > Rules.CELL_PICK) continue;
            double at = t0 + s * dt;
            if (at < pickT[k]) {
                pickT[k] = at;
                java.util.Arrays.fill(pickBy[k], false);
            }
            if (at == pickT[k]) pickBy[k][d.id] = true;
        }
    }

    public double distNext(Drone d) { return d.p.sub(track.c[d.nextGate]).len(); }

    public int[] positions() {
        long[] k = new long[drones.length];
        for (Drone d : drones) {
            if (d.state == Drone.FINISHED) k[d.id] = 1_000_000_000_000L - d.endTurn;
            else k[d.id] = d.gatesCleared * 100_000_000L - Math.round(Math.min(d.active() ? distNext(d) : d.endDist, 99_999_999));
        }
        int[] pos = new int[drones.length];
        for (int i = 0; i < k.length; i++) {
            pos[i] = 1;
            for (long x : k) if (x > k[i]) pos[i]++;
        }
        return pos;
    }

    public long[] rankKeys() {
        long[] k = new long[drones.length];
        for (Drone d : drones) {
            if (d.state == Drone.FINISHED) k[d.id] = 1_000_000_000_000L - d.endTurn;
            else k[d.id] = d.gatesCleared * 100_000_000L - Math.round(Math.min(d.endDist, 99_999_999));
        }
        return k;
    }

    public List<String> initLines(int id) {
        List<String> out = new ArrayList<>();
        out.add(drones.length + " " + id + " " + Rules.LAPS + " " + track.size());
        for (int g = 0; g < track.size(); g++) {
            Vec3 c = track.c[g], n = track.n[g];
            out.add(String.format(Locale.ROOT, "%.0f %.0f %.0f %.6f %.6f %.6f %.0f", c.x(), c.y(), c.z(), n.x(), n.y(), n.z(), rules.gateR()));
        }
        out.add(String.valueOf(cellPos.length));
        for (int k = 0; k < cellPos.length; k++)
            out.add(String.format(Locale.ROOT, "%.0f %.0f %.0f %s", cellPos[k].x(), cellPos[k].y(), cellPos[k].z(), new String[]{"CHARGE", "SHIELD", "GHOST"}[cellType[k]]));
        out.add(String.valueOf(pylons.length));
        for (double[] q : pylons) out.add(String.format(Locale.ROOT, "%.0f %.0f %.0f", q[0], q[1], q[2]));
        return out;
    }

    public List<String> turnLines() {
        List<String> out = new ArrayList<>();
        for (Drone d : drones) {
            out.add(String.format(Locale.ROOT, "%.2f %.2f %.2f %.2f %.2f %.2f %.6f %.6f %.6f %.6f %.6f %.6f %d %d %d %d %d %d %d %d %d %d %.6f %.6f %.6f",
                    d.p.x(), d.p.y(), d.p.z(), d.v.x(), d.v.y(), d.v.z(), d.f.x(), d.f.y(), d.f.z(), d.u.x(), d.u.y(), d.u.z(),
                    d.nextGate, d.lap, d.boosts, d.boostTimer, d.battery, d.cutout, d.state, d.shield, d.ghost, d.item,
                    d.w.x(), d.w.y(), d.w.z()));
        }
        for (int t : cellTimer) out.add(String.valueOf(t));
        return out;
    }
}
