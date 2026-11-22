package topgate.sim;

public record Rules(int league, int maxPlayers, int collisions, int boosts, boolean cells, boolean draft) {
    public static final double G = 20, THRUST = 50, DRAG = 0.97, BOOST = 300, RADIUS = 200;
    public static final double GATE_R = 650, RING_TUBE = 40, CRASH_DIV = 50, LAND_SPEED = 150;
    public static final double X = 12000, Y = 12000, Z = 5000;
    public static final double MAX_TILT = Math.toRadians(60), ANGLE_YAW = Math.toRadians(15), ANGLE_ACC = Math.toRadians(12);
    public static final double SLEW = Math.toRadians(20), ACRO_RATE = Math.toRadians(30), ACRO_YAW = Math.toRadians(15), SPIN_UP = 0.2;

    public static final int BOOST_RECHARGE = 40, CRASH_MAX = 10, DAMAGE_MAX = 20, BATTERY = 100, MAX_TURNS = 600, LAPS = 3;
    public static final int NONE = 0, BOUNCE = 1, CUTOUT = 2;
    public static final int CHARGE = 0, SHIELD = 1, GHOST = 2;
    public static final double CLEAR_INSIDE = 0.2, RESTART_HEIGHT = 300, START_SPACING = 450, START_AHEAD = 800;
    public static final double CELL_PICK = 350, DRAFT_DRAG = 0.9725, DRAFT_LEN = 1500, DRAFT_W = 300;
    public static final double TRIM_X = 11250, TRIM_Y = 11250, TRIM_Z = 4350, TRIM_R = 450;
    public static final String TRIM_TABLE = "bkU5H+23imZWAhzKq+ZaWTXz0auBYDMQsMTHpn5YGMvKqpAQbwD8xrKKeW9tufWYymxy";
    public static final double RESTITUTION = 0.5, DRONE_RESTITUTION = 0.8;
    public static final double SILVER_FEATURE = 0.15, GOLD_FEATURE = 0.35, CORKSCREW_GAP = 1380, FEATURE_ROOM = 1500;
    public static final int PYLON_MIN_R = 250, PYLON_MAX_R = 400;
    public static final double PYLON_MIN_LEG = 3000, PYLON_GATE_CLEAR = 1300, PYLON_START_CLEAR = 800, PYLON_WALL = 600;
    public static final int CELL_RESPAWN = 60, SHIELD_TURNS = 30, GHOST_TURNS = 30, START_GHOST = 30, CAM_DEFAULT = 30;

    public static double WOOD_GATE_R = 1000, WOOD_MARGIN = 3000, WOOD_SPACING = 2500;

    public double gateR() { return league <= 2 ? WOOD_GATE_R : GATE_R; }

    public double thrust() { return league >= 5 ? 2 * THRUST : THRUST; }

    public double clearR() { return gateR(); }

    public boolean pylons() { return league >= 5; }

    public double margin() { return league <= 2 ? WOOD_MARGIN : 1500; }

    public double spacing() { return league <= 2 ? WOOD_SPACING : 3000; }

    public static final int[] LEVEL_LEAGUE = {2, 2, 3, 4, 6};

    public static Rules forLevel(int level) {
        return forLeague(LEVEL_LEAGUE[Math.max(1, Math.min(4, level))]);
    }

    public static Rules forLeague(int league) {
        return switch (league) {
            case 1 -> new Rules(1, 2, NONE, 0, false, true);
            case 2 -> new Rules(2, 4, BOUNCE, 0, false, true);
            case 3 -> new Rules(3, 4, CUTOUT, 1, false, true);
            case 4 -> new Rules(4, 4, CUTOUT, 1, true, true);
            case 5 -> new Rules(5, 4, CUTOUT, 3, true, true);
            default -> new Rules(6, 4, CUTOUT, 3, true, true);
        };
    }
}
