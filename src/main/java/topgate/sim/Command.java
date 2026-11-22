package topgate.sim;

public record Command(int mode, int throttle, int yaw, int pitch, int roll, boolean boost, boolean use, int cam, String message) {
    public Command(int mode, int throttle, int yaw, int pitch, int roll, boolean boost, String message) {
        this(mode, throttle, yaw, pitch, roll, boost, false, -1, message);
    }

    public static final int ANGLE = 1, ACRO = 2;

    public static Command parse(String line, int mode) {
        String[] t = line.trim().split("\\s+");
        int i = 0;
        if (mode == 0) {
            if (t[0].equals("ANGLE")) { mode = ANGLE; i = 1; }
            else if (t[0].equals("ACRO")) { mode = ACRO; i = 1; }
            else mode = ANGLE;
        } else if (t.length > 0 && (t[0].equals("ANGLE") || t[0].equals("ACRO"))) i = 1;
        if (t.length < i + 4) throw new IllegalArgumentException("expected THROTTLE YAW PITCH ROLL");
        int th = clampInt(t[i], 0, 100), y = clampInt(t[i + 1], -100, 100), p = clampInt(t[i + 2], -100, 100),
                ro = clampInt(t[i + 3], -100, 100);
        i += 4;
        boolean boost = false, use = false;
        int cam = -1;
        while (i < t.length) {
            if (!boost && t[i].equals("BOOST")) { boost = true; i++; }
            else if (!use && t[i].equals("USE")) { use = true; i++; }
            else if (cam < 0 && t[i].equals("CAM") && i + 1 < t.length && t[i + 1].matches("-?\\d+")) { cam = new java.math.BigInteger(t[i + 1]).max(java.math.BigInteger.ZERO).min(java.math.BigInteger.valueOf(60)).intValue(); i += 2; }
            else break;
        }
        StringBuilder msg = new StringBuilder();
        for (; i < t.length; i++) msg.append(msg.length() == 0 ? "" : " ").append(t[i]);
        return new Command(mode, th, y, p, ro, boost, use, cam, msg.toString());
    }

    private static int clampInt(String s, int lo, int hi) {
        return Math.max(lo, Math.min(hi, Integer.parseInt(s)));
    }
}
