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

let lastMatch: MatchMessage | null = null;

export class PCServer {
  constructor(private overlay: OverlayServer) {}

  public async connect(socket: Socket, { reconnecting }: { reconnecting: boolean }) {
    const fillAndStartTournament = async (tournamentId: string) => {
      console.log("Creating and starting a new tournament");
      await addParticipants(tournamentId);
      await startTournament(tournamentId);
      this.overlay.updateMatchesData();
      console.log("Tournament properly started");
      await sendNextMatch();
    };

    const sendNextMatch = async () => {
      console.log("Preparing the next match.");
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
              console.log("Match properly sent");
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
        console.error("Error in sendNextMatch handle, trying again in 5 seconds", err);
        setTimeout(sendNextMatch, 5000);
      }
    };

    const sendStartNextMatch = async () => {
      console.log("Sending to start the match")
      socket.emit("startmatch");
    }

    socket.on("reemitlast", async () => {
      console.log("Received a reemit")
      if (lastMatch) {
        socket.emit("match", lastMatch);
        await sendStartNextMatch();
      } else {
        await sendNextMatch();
        await sendStartNextMatch();
      }
    });

    socket.on(
      "winner",
      async ({ matchId, winner, loser, isWinnerFirstPlayer }) => {
        console.log("Received a win!");
        let registeredWin = false;
        const registerWin = async () => {
          try {
            const tournament = await getNextTournament();
            await finishMatch(tournament.id, matchId, {
              winnerId: winner.id,
              winnerName: winner.name,
              isWinnerFirstPlayer,
            });
            return true;
          } catch (err) {
            console.error("Error while registering win, will retry", err);
            return false;
          }
        }
        try {
          registeredWin = await registerWin();
          while (!registeredWin) {
            await waitFor(5000);
            registeredWin = await registerWin();
          }
          
          lastMatch = null

          this.overlay.sendWinner({ isWinnerFirstPlayer });

          const NEXT_MATCH_IN_SECONDS = 30;
          this.overlay.nextMatchIn(NEXT_MATCH_IN_SECONDS);

          console.log(`Properly finished, match starting in ${NEXT_MATCH_IN_SECONDS} seconds`)

          await sendNextMatch();

          setTimeout(async () => {
            await sendStartNextMatch();
          }, NEXT_MATCH_IN_SECONDS * 1000);
        } catch (err) {
          console.error("Error in winner handle", err);
        }
      }
    );

    if (reconnecting && !!lastMatch) {
      console.log("Reconnecting");
      socket.emit("match", lastMatch);
    } else {
      await sendNextMatch();
      await sendStartNextMatch();
    }
  }
}

const waitFor = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
