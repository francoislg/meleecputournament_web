import type { Socket } from "socket.io";
import { OverlayServer } from "./overlay-server";
import { ChatServer } from "./chat-server";
import {
  addParticipants,
  startTournament,
  getNextTournament,
  getNextTournamentMatch,
  finishTournament,
  createNewTournament,
  finishMatch,
  officiallyStartMatch
} from "./tournament-commands";
import {
  hasEnoughEntriesForTournament,
  getNextSingleMatch,
  createSingleMatch,
  hasSingleMatchInProgress,
  officiallyStartSingleMatch,
  finishSingleMatch,
} from "./singlematches-commands";
import { MatchMessage } from "./types";

let lastMatch: MatchMessage | null = null;

export class PCServer {
  constructor(private overlay: OverlayServer, private chat: ChatServer) {}

  public async connect(
    socket: Socket,
    { reconnecting }: { reconnecting: boolean }
  ) {
    console.log("Connecting PC server");
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
          if (tournament.isPending) {
            await fillAndStartTournament(tournament.id);
          } else {
            const match = await getNextTournamentMatch(tournament.id);
            if (match) {
              socket.emit("match", match);
              lastMatch = match;
              this.overlay.updateMatchesData();
              console.log("Match properly sent");
            } else {
              const wins = await finishTournament(tournament.id);
              if (wins.length > 0) {
                this.chat.sendMessage(`Tournament won! Points awarded: ${wins.map(({userName, points}) => `${userName} +${points}`).join(", ")}`)
              }
              await sendNextMatch();
            }
          }
        } else if (await hasEnoughEntriesForTournament()) {
          const {tournamentId: newTournamentId, name, url} = await createNewTournament();
          await fillAndStartTournament(newTournamentId);
          this.chat.sendMessage(`"${name}" tournament started! Bracket: challonge.com/${url}`);
        } else {
          // Single match mode
          let match = await getNextSingleMatch();
          if (!match) {
            match = await createSingleMatch();
          }
          if (match) {
            socket.emit("match", match);
            lastMatch = match;
            this.overlay.updateMatchesData();
            console.log("Single match properly sent");
          }
        }
      } catch (err) {
        console.error(
          "Error in sendNextMatch handle, trying again in 5 seconds",
          err
        );
        setTimeout(sendNextMatch, 5000);
      }
    };

    const sendStartNextMatch = async () => {
      console.log("Sending to start the match");
      socket.emit("startmatch");

      if (!lastMatch) {
        console.error(
          "Somehow there were no last match stored, so we could not send the start signal."
        );
        return;
      }

      if (await hasSingleMatchInProgress()) {
        await officiallyStartSingleMatch(lastMatch.matchId);
      } else {
        try {
          const tournament = await getNextTournament();
          await officiallyStartMatch(tournament.id, lastMatch.matchId);
        } catch {
          console.error("COULD NOT SET AS STARTED IN CHALLONGE");
        }
      }

      this.overlay.startMatch();
      this.overlay.updateMatchesData();
    };

    socket.on("reemitlast", async () => {
      console.log("Received a reemit");
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
          if (await hasSingleMatchInProgress()) {
            const wins = await finishSingleMatch(matchId, {
              winnerId: winner.id,
              loserId: loser.id,
              isWinnerFirstPlayer,
            });
            if (wins.length > 0) {
              this.chat.sendMessage(`${winner.name} won! Points awarded: ${wins.map(({userName, points}) => `${userName} +${points}`).join(", ")}`)
            }
            return true;
          } else {
            try {
              const tournament = await getNextTournament();
              const wins = await finishMatch(tournament.id, matchId, {
                winnerId: winner.id,
                isWinnerFirstPlayer,
              });
              if (wins.length > 0) {
                this.chat.sendMessage(`${winner.name} won! Points awarded: ${wins.map(({userName, points}) => `${userName} +${points}`).join(", ")}`)
              }
              return true;
            } catch (err) {
              console.error("Error while registering win, will retry", err);
              return false;
            }
          }
        };
        try {
          registeredWin = await registerWin();
          while (!registeredWin) {
            await waitFor(5000);
            registeredWin = await registerWin();
          }

          lastMatch = null;

          this.overlay.sendWinner({ isWinnerFirstPlayer });

          const NEXT_MATCH_IN_SECONDS = 40;
          this.overlay.updateLeaderboard();
          this.overlay.updateEntries();
          this.overlay.nextMatchIn(NEXT_MATCH_IN_SECONDS);

          console.log(
            `Properly finished, match starting in ${NEXT_MATCH_IN_SECONDS} seconds`
          );

          await sendNextMatch();

          setTimeout(async () => {
            await sendStartNextMatch();
          }, (NEXT_MATCH_IN_SECONDS + 3) * 1000);
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

const waitFor = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
