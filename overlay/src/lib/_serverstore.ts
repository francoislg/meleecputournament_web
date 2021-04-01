import { io } from "socket.io-client";
import { readable, writable } from "svelte/store";

import type {InitialOverlayData, ILeaderboard, EntriesInfo, MatchesInfo, IWinnerInfo} from "../../../server/overlay-server";

const SECRET_OVERLAY_KEY = "yrxbJYtE4KbYX6Ci2RQGpSKBur7Ubh";

const socket = io("ws://localhost:8080/", {
    extraHeaders: {
        "overlay": SECRET_OVERLAY_KEY
    }
});

let isConnected = false;

export const connected = readable(isConnected, (set) => {
    const onConnect = () => {
        socket.emit("iamtheoverlay", SECRET_OVERLAY_KEY);
        set(true);
    }
    socket.on("connect", onConnect);
    const onDisconnect = () => set(false);
    socket.on("disconnect", onDisconnect);

    return () => {
        socket.off('connect', onConnect);
        socket.off("disconnect", onDisconnect);
    }
});

export const leaderboard = readable<ILeaderboard>({players: []}, (set) => {
    const onInit = (data: InitialOverlayData) => set(data.leaderboard);
    socket.on("init", onInit);
    const onLeaderboardUpdate = (data: ILeaderboard) => set(data);
    socket.on("leaderboard", onLeaderboardUpdate);

    return () => {
        socket.off("init", onInit);
        socket.off("leaderboard", onLeaderboardUpdate);
    }
});

export const entries = readable<EntriesInfo>({ entries: [] }, (set) => {
    const onInit = (data: InitialOverlayData) => set(data.entries);
    socket.on("init", onInit);
    const onEntriesUpdate = (data: EntriesInfo) => set(data);
    socket.on("entries", onEntriesUpdate);

    return () => {
        socket.off("init", onInit);
        socket.off("entries", onEntriesUpdate);
    }
});

export const matches = readable<MatchesInfo>({}, (set) => {
    const onInit = (data: InitialOverlayData) => set(data.matches);
    socket.on("init", onInit);
    const onMatches = (data: MatchesInfo) => set(data);
    socket.on("matches", onMatches);

    return () => {
        socket.off("init", onInit);
        socket.off("matches", onMatches);
    }
});

export const winner = readable<IWinnerInfo | null>(null, (set) => {
    const onWinner = (data: IWinnerInfo) => set(data);
    socket.on("winner", onWinner);
    const onMatches = () => set(null);
    socket.on("matches", onMatches);

    return () => {
        socket.off("winner", onWinner);
        socket.off("matches", onMatches);
    }
});

export const nextMatchInSeconds = readable<number | null>(null, (set) => {
    let interval;
    const onNextMatchIn = (data: number) => {
        let number = data;
        clearInterval(interval);
        interval = setInterval(() => {
            set(number--);
            if (number < 0) {
                clearInterval(interval);
            }
        }, 1000);
    };
    socket.on("nextmatchin", onNextMatchIn);
    const onMatches = () => set(null);
    socket.on("matches", onMatches);

    return () => {
        clearInterval(interval);
        socket.off("nextmatchin", onNextMatchIn);
        socket.off("matches", onMatches);
    }
});