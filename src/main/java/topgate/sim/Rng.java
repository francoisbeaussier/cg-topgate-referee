package topgate.sim;

public final class Rng {
    private long s;

    public Rng(long seed) { s = seed; }

    public long next() {
        long z = (s += 0x9E3779B97F4A7C15L);
        z = (z ^ (z >>> 30)) * 0xBF58476D1CE4E5B9L;
        z = (z ^ (z >>> 27)) * 0x94D049BB133111EBL;
        return z ^ (z >>> 31);
    }

    public int nextInt(int n) { return (int) Long.remainderUnsigned(next(), n); }

    public double nextDouble() { return (next() >>> 11) * 0x1.0p-53; }

    public double range(double a, double b) { return a + (b - a) * nextDouble(); }
}
