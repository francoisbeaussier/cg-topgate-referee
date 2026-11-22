package topgate.sim;

public record Vec3(double x, double y, double z) {
    public static final Vec3 ZERO = new Vec3(0, 0, 0);
    public static final Vec3 UP = new Vec3(0, 0, 1);

    public Vec3 add(Vec3 o) { return new Vec3(x + o.x, y + o.y, z + o.z); }
    public Vec3 sub(Vec3 o) { return new Vec3(x - o.x, y - o.y, z - o.z); }
    public Vec3 mul(double k) { return new Vec3(x * k, y * k, z * k); }
    public double dot(Vec3 o) { return x * o.x + y * o.y + z * o.z; }
    public Vec3 cross(Vec3 o) { return new Vec3(y * o.z - z * o.y, z * o.x - x * o.z, x * o.y - y * o.x); }
    public double len() { return Math.sqrt(dot(this)); }
    public Vec3 norm() { double l = len(); return l == 0 ? this : mul(1 / l); }

    public Vec3 rot(Vec3 k, double a) {
        double c = Math.cos(a), s = Math.sin(a);
        return mul(c).add(k.cross(this).mul(s)).add(k.mul(k.dot(this) * (1 - c)));
    }

    public Vec3 round(double scale) { return new Vec3(r(x, scale), r(y, scale), r(z, scale)); }

    public static double r(double v, double scale) { return Math.floor(v * scale + 0.5) / scale; }
}
