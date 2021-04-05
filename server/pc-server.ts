import type { Socket } from "socket.io";
import { OverlayServer } from "./overlay-server";
import {
  addParticipants,
  startTournament,
  getNextTournament,
  getNextTournamentMatch,
  finishTournament,
  createNewTournament,
  finishMatch,
  officiallyStartMatch,
  PlayerMessageMeta,
  MatchMessage,
} from "./tournament-commands";

export interface MatchResponseMessage {
  winner: PlayerMessageMeta;
  loser: PlayerMessageMeta;
  isWinnerFirstPlayer: boolean;
  matchId: number;
}

export class PCServer {
  constructor(private overlay: OverlayServer) {}

  public connect(socket: Socket, { reconnecting }: { reconnecting: boolean }) {
    let lastMatch: MatchMessage;
    
    const fillAndStartTournament = async (tournamentId: string) => {
      await addParticipants(tournamentId);
      await startTournament(tournamentId);
      this.overlay.updateMatchesData();
      await sendNextMatch();
    };

    const sendNextMatch = async () => {
      try {
        const tournament = await getNextTournament();

        if (tournament) {
          if (tournament.state === "pending") {
            await fillAndStartTournament(tournament.id);
          } else {
            const match = await getNextTournamentMatch(tournament.id);
            if (match) {
              await officiallyStartMatch(tournament.id, match.matchId);
              socket.emit("match", match);
              lastMatch = match;
              this.overlay.updateMatchesData();
            } else {
              await finishTournament(tournament.id);
              const newTournamentId = await createNewTournament();
              await fillAndStartTournament(newTournamentId);
            }
          }
        } else {
          const newTournamentId = await createNewTournament();
          await fillAndStartTournament(newTournamentId);
        }
      } catch (err) {
        console.error(err);
      }
    };

    socket.on("reemitlast", () => {
      if (lastMatch) {
        socket.emit("match", lastMatch);
      }
    });

    socket.on(
      "winner",
      async ({ matchId, winner, loser, isWinnerFirstPlayer }) => {
        try {
          const tournament = await getNextTournament();
          await finishMatch(tournament.id, matchId, {
            winnerId: winner.id,
            winnerName: winner.name,
            isWinnerFirstPlayer,
          });

          this.overlay.sendWinner({ isWinnerFirstPlayer });

          const NEXT_MATCH_IN_SECONDS = 10;
          this.overlay.nextMatchIn(NEXT_MATCH_IN_SECONDS);

          setTimeout(async () => {
            await sendNextMatch();
          }, NEXT_MATCH_IN_SECONDS * 1000);
        } catch (err) {
          console.error(err);
        }
      }
    );

    if (!reconnecting) {
      sendNextMatch();
    } else if (lastMatch) {
      socket.emit("match", lastMatch);
    }
  }
}
