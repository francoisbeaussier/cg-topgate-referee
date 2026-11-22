package topgate.sim;

import java.util.ArrayList;
import java.util.List;

public final class Track {
    public final Vec3[] c;
    public final Vec3[] n;

    public Track(Vec3[] c, Vec3[] n) { this.c = c; this.n = n; }

    public int size() { return c.length; }

    public static Track scenario(long seed) {
        double[][] g;
        if (seed == 7770101L) g = new double[][]{{4000, 6000, 2500}, {5380, 6000, 2500}, {6760, 6000, 2500}, {8140, 6000, 2500}, {9520, 6000, 2500}};
        else if (seed == 7770102L) g = new double[][]{{6000, 6000, 1000}, {6000, 6000, 2380}, {6000, 6000, 3760}};
        else if (seed == 7770103L) g = new double[][]{{10500, 6000, 2500, 0, 1}, {6000, 10500, 2500, -1, 0}, {1500, 6000, 2500, 0, -1}, {6000, 1500, 2500, 1, 0}};
        else return path(seed);
        Vec3[] c = new Vec3[g.length], n = new Vec3[g.length];
        for (int i = 0; i < g.length; i++) { c[i] = new Vec3(g[i][0], g[i][1], g[i][2]); n[i] = g[i].length > 3 ? new Vec3(g[i][3], g[i][4], 0) : new Vec3(0, 1, 0); }
        return new Track(c, n);
    }

    private static Track path(long seed) {
        List<Vec3> cs = new ArrayList<>(), ns = new ArrayList<>();
        if (seed == 7770104L) {
            for (int i = 0; i < 50; i++) {
                if (i == 1 || i == 2) continue;
                double t = 2 * Math.PI * i / 50;
                cs.add(new Vec3(6000 + 4800 * Math.cos(t), 6000 + 4800 * Math.sin(t), 2500 + 1500 * Math.sin(t)));
                ns.add(new Vec3(-4800 * Math.sin(t), 4800 * Math.cos(t), 1500 * Math.cos(t)));
            }
        } else if (seed == 7770105L) {
            double climb = 3000 / (4 * Math.PI);
            for (int i = 0; i < 20; i++) {
                double t = 2 * Math.PI * i / 10;
                cs.add(new Vec3(6000 + 3500 * Math.cos(t), 6000 + 3500 * Math.sin(t), 1000 + climb * t));
                ns.add(new Vec3(-3500 * Math.sin(t), 3500 * Math.cos(t), climb));
            }
            for (double z : new double[]{3800, 2900, 2000}) {
                cs.add(new Vec3(6000, 6000, z));
                ns.add(new Vec3(0, 0, -1));
            }
        } else if (seed == 7770106L) {
            for (int i = 0; i < 16; i++) {
                double t = 2 * Math.PI * i / 16;
                cs.add(new Vec3(6000 + 4800 * Math.sin(t), 6000 + 3000 * Math.sin(2 * t), 2500 + 1300 * Math.cos(t)));
                ns.add(new Vec3(4800 * Math.cos(t), 6000 * Math.cos(2 * t), -1300 * Math.sin(t)));
            }
        } else if (seed == 7770107L) {
            cs.add(new Vec3(2500, 3000, 1200));
            ns.add(new Vec3(1, 0, 0));
            for (int i = 0; i <= 6; i++) {
                double f = 2 * Math.PI * i / 6;
                cs.add(new Vec3(6000 + 1700 * Math.sin(f), 3000 + 1400 * i / 6.0, 2500 - 1700 * Math.cos(f)));
                ns.add(new Vec3(1700 * Math.cos(f), 1400 / (2 * Math.PI), 1700 * Math.sin(f)));
            }
            cs.add(new Vec3(9800, 6000, 2000));
            ns.add(new Vec3(0, 1, 0));
            cs.add(new Vec3(6000, 9300, 2800));
            ns.add(new Vec3(-1, 0, 0));
            cs.add(new Vec3(2200, 6000, 2000));
            ns.add(new Vec3(0, -1, 0));
        } else return null;
        Vec3[] c = new Vec3[cs.size()], n = new Vec3[cs.size()];
        for (int i = 0; i < c.length; i++) { c[i] = cs.get(i).round(1); n[i] = ns.get(i).norm().round(1e6); }
        return new Track(c, n);
    }

    public static Track custom() {
        String f = System.getenv("TG_TRACK");
        if (f == null) return null;
        try {
            List<Vec3> cs = new ArrayList<>(), ns = new ArrayList<>();
            for (String line : java.nio.file.Files.readAllLines(java.nio.file.Path.of(f))) {
                String[] t = line.trim().split("\\s+");
                if (t.length < 6 || t[0].startsWith("#")) continue;
                cs.add(new Vec3(Double.parseDouble(t[0]), Double.parseDouble(t[1]), Double.parseDouble(t[2])));
                ns.add(new Vec3(Double.parseDouble(t[3]), Double.parseDouble(t[4]), Double.parseDouble(t[5])).norm().round(1e6));
            }
            return new Track(cs.toArray(new Vec3[0]), ns.toArray(new Vec3[0]));
        } catch (java.io.IOException e) {
            throw new java.io.UncheckedIOException(e);
        }
    }

    public static Track generate(Rng r, int league, double margin, double spacing) {
        for (int attempt = 0; attempt < 200; attempt++) {
            Track t = build(r, league, margin, spacing, true);
            if (t != null) return t;
        }
        return build(r, league, margin, spacing, false);
    }

    private static Track build(Rng r, int league, double margin, double spacing, boolean strict) {
        boolean elements = league >= 3;
        int count = !elements ? 3 + r.nextInt(3) : league >= 6 ? 5 + r.nextInt(2) : 3 + r.nextInt(3);
        Vec3[] c = new Vec3[count];
        outer:
        for (int i = 0; i < count; ) {
            Vec3 p = new Vec3(Vec3.r(r.range(margin, Rules.X - margin), 1), Vec3.r(r.range(margin, Rules.Y - margin), 1),
                    Vec3.r(r.range(600, 3500), 1));
            for (int j = 0; j < i; j++) if (p.sub(c[j]).len() < spacing) continue outer;
            if (i == 1 && Math.hypot(p.x() - c[0].x(), p.y() - c[0].y()) > 4000) continue;
            c[i++] = p;
        }
        Vec3[] n = new Vec3[count];
        double maxE = Math.toRadians(20);
        for (int i = 0; i < count; i++) {
            Vec3 prev = c[(i - 1 + count) % count], next = c[(i + 1) % count];
            Vec3 d = c[i].sub(prev).norm().add(next.sub(c[i]).norm());
            if (d.len() < 1e-9) d = c[i].sub(prev);
            double h = Math.atan2(d.y(), d.x()) + Math.toRadians(r.range(-35, 35));
            double e = Math.max(-maxE, Math.min(maxE, Math.atan2(d.z(), Math.hypot(d.x(), d.y()))));
            e = Math.max(-maxE, Math.min(maxE, e + Math.toRadians(r.range(-10, 10))));
            n[i] = new Vec3(Math.cos(e) * Math.cos(h), Math.cos(e) * Math.sin(h), Math.sin(e)).round(1e6);
        }
        if (!elements) return new Track(c, n);
        Vec3[][] special = new Vec3[count][];
        if (league >= 4) {
            double p = league == 4 ? Rules.SILVER_FEATURE : Rules.GOLD_FEATURE;
            for (int kk = 0; kk < 4; kk++) {
                int kind = (kk + 3) % 4;
                boolean want = league >= 6 || r.nextDouble() < p;
                if (!want) continue;
                boolean ok = false;
                int start = 2 + r.nextInt(Math.max(1, count - 2));
                for (int k = 0; k < count - 2 && !ok; k++) {
                    int i = 2 + (start - 2 + k) % (count - 2);
                    if (special[i] != null) continue;
                    Vec3[] el = null;
                    for (int tries = 0; tries < (kind == 3 ? 6 : 1) && el == null; tries++) el = feature(r, c, i, n[i], kind);
                    if (el != null) { special[i] = el; ok = true; }
                }
                if (!ok && league >= 6 && strict && kind < 3) return null;
            }
        }
        List<Vec3> oc = new ArrayList<>(), on = new ArrayList<>();
        int placed = 0;
        for (int i = 0; i < count; i++) {
            if (special[i] != null) {
                for (int k = 0; k < special[i].length; k += 2) {
                    oc.add(special[i][k]);
                    on.add(special[i][k + 1]);
                }
                continue;
            }
            boolean tryIt = i >= 2 && placed < 2 && r.nextDouble() < 0.5;
            int kind = r.nextInt(2);
            boolean flip = r.nextInt(2) == 1;
            Vec3[] el = tryIt ? element(c, i, n[i], kind, flip) : null;
            if (el == null) {
                oc.add(c[i]);
                on.add(n[i]);
            } else {
                placed++;
                oc.add(el[0]);
                on.add(el[1]);
                oc.add(el[2]);
                on.add(el[3]);
            }
        }
        return new Track(oc.toArray(new Vec3[0]), on.toArray(new Vec3[0]));
    }

    private static Vec3[] feature(Rng r, Vec3[] c, int i, Vec3 n, int kind) {
        Vec3 e = new Vec3(n.x(), n.y(), 0).norm().round(1e6);
        Vec3 back = e.mul(-1);
        List<Vec3> pts = new ArrayList<>(), dirs = new ArrayList<>();
        if (kind == 0) {
            boolean same = r.nextInt(2) == 0, up = r.nextInt(2) == 0;
            double[] zs = {1000, 2380, 3760};
            for (int k = 0; k < 3; k++) {
                double z = zs[up ? k : 2 - k];
                pts.add(new Vec3(c[i].x(), c[i].y(), z));
                dirs.add(same || k % 2 == 0 ? e : back);
            }
        } else if (kind == 1) {
            int m = 2 + r.nextInt(2);
            boolean flip = r.nextInt(2) == 1;
            Vec3 side = new Vec3(-e.y(), e.x(), 0).mul(flip ? -Rules.CORKSCREW_GAP : Rules.CORKSCREW_GAP);
            double z = Math.max(1200, Math.min(3300, c[i].z()));
            Vec3 mid = new Vec3(c[i].x(), c[i].y(), z);
            for (int k = 0; k < m; k++) {
                pts.add(mid.add(side.mul(k - (m - 1) / 2.0)).round(1));
                dirs.add(e);
            }
        } else if (kind == 3) {
            int m = 2 + r.nextInt(2);
            double rr = Vec3.r(r.range(2000, 3200), 1);
            Vec3 left = new Vec3(-e.y(), e.x(), 0).mul(r.nextInt(2) == 0 ? 1 : -1);
            double z = Math.max(1200, Math.min(3300, c[i].z()));
            Vec3 o = new Vec3(c[i].x(), c[i].y(), z).add(left.mul(rr));
            for (int k = 0; k < m; k++) {
                double a = Math.PI * k / (m - 1);
                pts.add(o.sub(left.mul(rr * Math.cos(a))).add(e.mul(rr * Math.sin(a))).round(1));
                dirs.add(e.mul(Math.cos(a)).add(left.mul(Math.sin(a))).round(1e6));
            }
        } else {
            boolean dive = r.nextInt(2) == 0;
            double z = dive ? Vec3.r(r.range(1600, 3200), 1) : Vec3.r(r.range(1600, 2800), 1);
            pts.add(new Vec3(c[i].x(), c[i].y(), z));
            dirs.add(new Vec3(0, 0, dive ? -1 : 1));
        }
        double room = Rules.FEATURE_ROOM;
        for (int k = 0; k < pts.size(); k++) {
            Vec3 p = pts.get(k), dk = dirs.get(k);
            Vec3 t = Math.hypot(dk.x(), dk.y()) < 1e-6 ? e : new Vec3(dk.x(), dk.y(), 0).norm();
            if (p.x() < 1000 || p.x() > Rules.X - 1000 || p.y() < 1000 || p.y() > Rules.Y - 1000) return null;
            for (Vec3 q : new Vec3[]{p.add(t.mul(room)), p.sub(t.mul(room))})
                if (q.x() < 600 || q.x() > Rules.X - 600 || q.y() < 600 || q.y() > Rules.Y - 600) return null;
            for (int j = 0; j < c.length; j++) if (j != i && Math.hypot(p.x() - c[j].x(), p.y() - c[j].y()) < 2000) return null;
        }
        Vec3[] out = new Vec3[pts.size() * 2];
        for (int k = 0; k < pts.size(); k++) {
            out[2 * k] = pts.get(k);
            out[2 * k + 1] = dirs.get(k);
        }
        return out;
    }

    private static Vec3[] element(Vec3[] c, int i, Vec3 n, int kind, boolean flip) {
        Vec3 e = new Vec3(n.x(), n.y(), 0).norm().round(1e6);
        Vec3 back = e.mul(-1);
        Vec3 a, b;
        if (kind == 0) {
            double z0 = Math.max(700, Math.min(2400, c[i].z()));
            Vec3 lo = new Vec3(c[i].x(), c[i].y(), z0), hi = new Vec3(c[i].x(), c[i].y(), z0 + 1380);
            a = flip ? hi : lo;
            b = flip ? lo : hi;
        } else {
            Vec3 side = new Vec3(-e.y(), e.x(), 0).mul(flip ? -690 : 690);
            a = c[i].sub(side).round(1);
            b = c[i].add(side).round(1);
        }
        for (Vec3 p : new Vec3[]{a, b}) {
            if (p.x() < 1000 || p.x() > Rules.X - 1000 || p.y() < 1000 || p.y() > Rules.Y - 1000 || p.z() < 600 || p.z() > 4000)
                return null;
            for (int j = 0; j < c.length; j++) if (j != i && p.sub(c[j]).len() < 2000) return null;
        }
        return new Vec3[]{a, e, b, back};
    }
}
