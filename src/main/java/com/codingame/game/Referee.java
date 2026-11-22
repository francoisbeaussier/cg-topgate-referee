package com.codingame.game;

import com.codingame.gameengine.core.AbstractPlayer.TimeoutException;
import com.codingame.gameengine.core.AbstractReferee;
import com.codingame.gameengine.core.MultiplayerGameManager;
import com.codingame.gameengine.module.endscreen.EndScreenModule;
import com.codingame.gameengine.module.entities.GraphicEntityModule;
import com.google.inject.Inject;
import topgate.sim.Command;
import topgate.sim.Drone;
import topgate.sim.Game;
import topgate.sim.Rules;

import java.util.List;

public class Referee extends AbstractReferee {
    @Inject private MultiplayerGameManager<Player> gameManager;
    @Inject private GraphicEntityModule graphics;
    @Inject private EndScreenModule endScreen;
    @Inject private FpvModule fpv;

    private Game game;
    private Rules rules;

    @Override
    public void init() {
        rules = Rules.forLevel(gameManager.getLeagueLevel());
        game = new Game(rules, gameManager.getPlayerCount(), gameManager.getSeed());
        gameManager.setMaxTurns(Rules.MAX_TURNS);
        gameManager.setTimebank(28_000 / gameManager.getPlayerCount());
        gameManager.setFrameDuration(150);
        fpv.init(game, 28_000 / gameManager.getPlayerCount());
    }

    @Override
    public void gameTurn(int turn) {
        List<String> lines = game.turnLines();
        for (Player p : gameManager.getActivePlayers()) {
            if (!game.drones[p.getIndex()].active()) continue;
            if (turn == 1) for (String l : game.initLines(p.getIndex())) p.sendInputLine(l);
            p.sendInputLine(String.valueOf(Math.max(0, p.getRemainingTimebank())));
            for (String l : lines) p.sendInputLine(l);
            p.execute();
        }
        Command[] cmds = new Command[game.drones.length];
        for (Player p : gameManager.getActivePlayers()) {
            Drone d = game.drones[p.getIndex()];
            if (!d.active()) continue;
            try {
                cmds[p.getIndex()] = Command.parse(p.getOutputs().get(0), d.mode);
            } catch (TimeoutException e) {
                eliminate(p, d, p.getNicknameToken() + " timeout!");
            } catch (RuntimeException e) {
                eliminate(p, d, p.getNicknameToken() + " invalid output: " + e.getMessage());
            }
        }
        for (int i = 0; i < cmds.length; i++)
            if (cmds[i] == null && game.drones[i].active()) cmds[i] = new Command(Command.ANGLE, 0, 0, 0, 0, false, "");
        game.step(cmds);
        fpv.setCommands(cmds);
        int[] bank = new int[cmds.length];
        for (Player p : gameManager.getPlayers()) bank[p.getIndex()] = p.isActive() ? Math.max(0, p.getRemainingTimebank()) : 0;
        fpv.setBank(bank);
        if (game.over() || gameManager.getActivePlayers().size() <= 1) gameManager.endGame();
    }

    private void eliminate(Player p, Drone d, String why) {
        p.deactivate(why);
        p.setScore(-1000 + game.turn);
        d.state = Drone.DESTROYED;
        d.endTurn = game.turn;
        d.endDist = game.distNext(d);
        gameManager.addToGameSummary(why);
    }

    @Override
    public void onEnd() {
        long[] k = game.rankKeys();
        int[] scores = new int[k.length];
        String[] texts = new String[k.length];
        for (Player p : gameManager.getPlayers()) {
            int i = p.getIndex();
            Drone d = game.drones[i];
            if (p.isActive()) p.setScore(score(d));
            scores[i] = p.getScore();
            texts[i] = d.state == Drone.FINISHED ? "finished turn " + d.endTurn : d.gatesCleared + " gates";
        }
        endScreen.setScores(scores, texts);
    }

    private int score(Drone d) {
        if (d.state == Drone.FINISHED) return 1_000_000_000 - d.endTurn;
        return d.gatesCleared * 100_000 + 99_999 - (int) Math.min(99_999, Math.round(d.endDist));
    }
}
