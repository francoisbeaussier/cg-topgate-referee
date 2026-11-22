package topgate.sim;

public final class Drone {
    public static final int DESTROYED = 0, FLYING = 1, FINISHED = 2;
    public final int id;
    public Vec3 p, v, f, u, w = Vec3.ZERO;
    public int mode, boosts, boostTimer, battery = Rules.BATTERY, cutout, state = FLYING;
    public int nextGate = 1, lap, gatesCleared, endTurn = -1, shield, ghost, item, cam = Rules.CAM_DEFAULT;
    public boolean motorsOff, draft, entered;
    public int crashTurns, lastBoostTurn = -1, lastCellCharge = -1, slot, cutouts, trimTurn = -1;
    public double endDist;
    public final double[] contacts = new double[8];

    public Drone(int id, Vec3 p, Vec3 f) { this.id = id; this.p = p; this.v = Vec3.ZERO; this.f = f; this.u = Vec3.UP; }

    public Drone copy(int newId) {
        Drone d = new Drone(newId, p, f);
        d.v = v; d.u = u; d.w = w; d.mode = mode; d.boosts = boosts; d.boostTimer = boostTimer; d.battery = battery;
        d.cutout = cutout; d.crashTurns = crashTurns; d.entered = entered; d.state = state; d.nextGate = nextGate; d.lap = lap; d.gatesCleared = gatesCleared;
        d.endTurn = endTurn; d.endDist = endDist; d.shield = shield; d.ghost = ghost; d.item = item; d.cam = cam;
        return d;
    }

    public boolean active() { return state == FLYING; }
}
