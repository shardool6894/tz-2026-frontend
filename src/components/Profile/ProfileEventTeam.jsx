import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../Context/AuthManager";
import { useSnackbar } from "../../Context/SnackbarProvider";
import { authFetch } from "../utils/authFetch";

const userHasEvent = (user, eventId) =>
  (Array.isArray(user?.events) ? user.events : [])
    .map((e) => String(e && e._id ? e._id : e))
    .includes(String(eventId));

const ProfileEventTeam = ({ eventId }) => {
  const { user, forceLogout } = useAuth();
  const { notify } = useSnackbar();
  const [teamState, setTeamState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const registeredLocally = useMemo(
    () => userHasEvent(user, eventId),
    [user, eventId]
  );

  const loadTeam = useCallback(async () => {
    if (!eventId || !user) return;
    setLoading(true);
    try {
      const { res, data } = await authFetch(`/api/events/${eventId}/team`);
      if (res.status === 401) {
        notify("Your session has expired. Please log in again.", { variant: "error" });
        forceLogout();
        return;
      }
      if (res.ok && data.team) {
        setTeamState(data.team);
      } else {
        setTeamState(null);
      }
    } catch {
      setTeamState(null);
    } finally {
      setLoading(false);
    }
  }, [eventId, user, notify, forceLogout]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { res, data } = await authFetch(
          `/api/users/search?q=${encodeURIComponent(trimmed)}`
        );
        if (res.status === 401) {
          forceLogout();
          return;
        }
        if (res.ok && Array.isArray(data.users)) {
          setSearchResults(data.users);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, forceLogout]);

  const sendInvite = async (email) => {
    const trimmed = String(email || "").trim().toLowerCase();
    if (!trimmed || actionLoading) return;
    setActionLoading(true);
    try {
      const { res, data } = await authFetch(`/api/events/${eventId}/team/invites`, {
        method: "POST",
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.status === 401) {
        notify("Your session has expired. Please log in again.", { variant: "error" });
        forceLogout();
        return;
      }
      if (!res.ok) {
        notify(data.message || "Could not send invite", { variant: "error" });
        return;
      }
      if (data.team) setTeamState(data.team);
      setQuery("");
      setSearchResults([]);
      notify(data.message || "Invite sent", { variant: "success" });
    } catch {
      notify("Couldn't reach the server. Please try again.", { variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // const acceptInvite = async () => {
  //   if (actionLoading) return;
  //   setActionLoading(true);
  //   try {
  //     const { res, data } = await authFetch(`/api/events/${eventId}/team/invites/accept`, {
  //       method: "POST",
  //     });
  //     if (res.status === 401) {
  //       notify("Your session has expired. Please log in again.", { variant: "error" });
  //       forceLogout();
  //       return;
  //     }
  //     if (!res.ok) {
  //       notify(data.message || "Could not accept invite", { variant: "error" });
  //       return;
  //     }
  //     if (data.user) updateUser(data.user);
  //     if (data.team) setTeamState(data.team);
  //     notify(data.message || "Joined team", { variant: "success" });
  //   } catch {
  //     notify("Couldn't reach the server. Please try again.", { variant: "error" });
  //   } finally {
  //     setActionLoading(false);
  //   }
  // };

  // const declineInvite = async () => {
  //   if (actionLoading) return;
  //   setActionLoading(true);
  //   try {
  //     const { res, data } = await authFetch(`/api/events/${eventId}/team/invites/decline`, {
  //       method: "POST",
  //     });
  //     if (res.status === 401) {
  //       notify("Your session has expired. Please log in again.", { variant: "error" });
  //       forceLogout();
  //       return;
  //     }
  //     if (!res.ok) {
  //       notify(data.message || "Could not decline invite", { variant: "error" });
  //       return;
  //     }
  //     if (data.team) setTeamState(data.team);
  //     notify("Invite declined", { variant: "info" });
  //   } finally {
  //     setActionLoading(false);
  //   }
  // };

  if (!user || !eventId) return null;

  if (loading) {
    return (
      <div className="mt-6 p-3 rounded-lg bg-black/40 border border-cyan-500/20">
        <p className="text-sm opacity-70">Loading team details…</p>
      </div>
    );
  }

  const isIndividual = teamState?.limits?.isIndividual;
  if (isIndividual) return null;

  const registered = (teamState && teamState.registered) || registeredLocally;
  // const incoming = teamState && teamState.pendingIncoming;
  const isLeader = teamState ? teamState.role === "leader" : registered;
  const canInvite = teamState ? teamState.canInvite : registered && isLeader;
  const teamFull = teamState?.teamFull ?? false;
  const maxSize = teamState?.limits?.max ?? 5;

  // if (incoming && !registered) {
  //   return (
  //     <div className="mt-6 p-4 rounded-lg bg-black/40 border border-cyan-500/20 flex flex-col gap-3">
  //       <span className="text-xs uppercase tracking-wider opacity-70">Team invite</span>
  //       <p className="text-sm">
  //         <span className="font-semibold text-cyan-300">
  //           {incoming.leader?.name || "Someone"}
  //         </span>{" "}
  //         invited you to join their team. Accepting will register you for this event.
  //       </p>
  //       <div className="flex flex-wrap gap-2">
  //         <button
  //           type="button"
  //           disabled={actionLoading}
  //           onClick={acceptInvite}
  //           className="px-4 py-2 rounded-lg bg-green-900/40 border border-green-400/40 text-green-200 text-sm font-semibold disabled:opacity-50"
  //         >
  //           {actionLoading ? "Working…" : "Accept invite"}
  //         </button>
  //         <button
  //           type="button"
  //           disabled={actionLoading}
  //           onClick={declineInvite}
  //           className="px-4 py-2 rounded-lg border border-white/20 text-sm font-semibold disabled:opacity-50"
  //         >
  //           Decline
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  if (!registered) {
    return (
      <div className="mt-6 p-3 rounded-lg bg-black/40 border border-cyan-500/20">
        <span className="block text-xs uppercase tracking-wider opacity-70 mb-1">Team</span>
        <p className="text-sm opacity-70">Add this event first, then you can invite teammates here.</p>
      </div>
    );
  }

  const leader = teamState?.leader;
  const members = teamState?.members || [];
  const pending = teamState?.pendingOutgoing || [];
  const roster = [
    {
      key: "leader",
      name: leader?.name || user.name || "You",
      email: leader?.email || user.email || "",
      status: "leader",
    },
    ...members.map((m) => ({
      key: m.id || m.email,
      name: m.name || m.email,
      email: m.email || "",
      status: "member",
    })),
    ...pending.map((m) => ({
      key: `pending-${m.id || m.email}`,
      name: m.name || m.email,
      email: m.email || "",
      status: "pending",
    })),
  ];

  return (
    <div className="mt-6 p-4 rounded-lg bg-black/40 border border-cyan-500/20 flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-wider opacity-70">Team</span>
        <span className="text-xs opacity-60">
          {roster.length} / {maxSize} participants
          {teamFull ? " · Full" : ""}
        </span>
      </div>

      {isLeader && canInvite && (
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wider opacity-70" htmlFor="teammate-search">
            Search teammates by email
          </label>
          <input
            id="teammate-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Start typing an email…"
            autoComplete="off"
            className="w-full px-3 py-2.5 rounded-lg bg-black/50 border border-cyan-500/30 text-sm"
          />
          {searchLoading && <p className="text-xs opacity-60">Searching…</p>}
          {!searchLoading && query.trim().length >= 2 && searchResults.length === 0 && (
            <p className="text-xs opacity-60">No users found for that email.</p>
          )}
          {searchResults.length > 0 && (
            <ul className="rounded-lg border border-cyan-500/20 divide-y divide-cyan-500/10 overflow-hidden">
              {searchResults.map((result) => (
                <li
                  key={result.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-black/30 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{result.name || "User"}</p>
                    <p className="text-xs opacity-70 truncate">{result.email}</p>
                  </div>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => sendInvite(result.email)}
                    className="shrink-0 px-3 py-1.5 rounded-md bg-cyan-950/60 border border-cyan-400/50 text-xs font-semibold disabled:opacity-50"
                  >
                    Invite
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isLeader && teamFull && (
        <p className="text-sm text-cyan-300/80">Your team is full. Remove a pending invite or wait for responses before adding more.</p>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider opacity-70">Your teammates</span>
        {roster.length <= 1 && members.length === 0 && pending.length === 0 ? (
          <p className="text-sm opacity-70">No teammates yet. Use the search bar above to invite someone.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {roster.map((person) => (
              <li
                key={person.key}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-black/30 border border-cyan-500/15 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{person.name}</p>
                  {person.email && (
                    <p className="text-xs opacity-70 truncate">{person.email}</p>
                  )}
                </div>
                <span
                  className={`text-xs uppercase tracking-wide px-2 py-0.5 rounded ${
                    person.status === "leader"
                      ? "bg-cyan-900/50 text-cyan-200"
                      : person.status === "pending"
                        ? "bg-amber-900/40 text-amber-200"
                        : "bg-green-900/30 text-green-200"
                  }`}
                >
                  {person.status === "leader"
                    ? "Leader"
                    : person.status === "pending"
                      ? "Invite sent"
                      : "Member"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {teamState?.role === "member" && (
        <p className="text-sm opacity-70">You joined this team as a member.</p>
      )}
    </div>
  );
};

export default ProfileEventTeam;
