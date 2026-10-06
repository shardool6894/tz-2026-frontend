import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../Context/AuthManager";
import { useSnackbar } from "../../Context/SnackbarProvider";
import { authFetch } from "../utils/authFetch";

const isIndividualEvent = (teamSize) => {
  const raw = teamSize == null ? "" : String(teamSize).trim();
  if (!raw || raw === "1") return true;
  const nums = raw.match(/\d+/g);
  if (!nums) return false;
  const max = Math.max(...nums.map(Number));
  return max <= 1;
};

const ProfileEventTeam = ({ eventId, teamSize }) => {
  const { user, updateUser, forceLogout } = useAuth();
  const { notify } = useSnackbar();
  const [teamState, setTeamState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [lookupUser, setLookupUser] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const individual = isIndividualEvent(teamSize);

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
    if (individual) {
      setLoading(false);
      return undefined;
    }
    loadTeam();
    return undefined;
  }, [individual, loadTeam]);

  if (!user || !eventId || individual) return null;

  const handleLookup = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      notify("Enter your teammate's email", { variant: "error" });
      return;
    }
    setLookupLoading(true);
    setLookupUser(null);
    try {
      const { res, data } = await authFetch(
        `/api/users/lookup?email=${encodeURIComponent(trimmed)}`
      );
      if (res.status === 401) {
        notify("Your session has expired. Please log in again.", { variant: "error" });
        forceLogout();
        return;
      }
      if (!res.ok) {
        notify(data.message || "User not found", { variant: "error" });
        return;
      }
      setLookupUser(data.user);
    } catch {
      notify("Couldn't reach the server. Please try again.", { variant: "error" });
    } finally {
      setLookupLoading(false);
    }
  };

  const sendInvite = async () => {
    const trimmed = email.trim().toLowerCase();
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
      setEmail("");
      setLookupUser(null);
      notify(data.message || "Invite sent", { variant: "success" });
    } catch {
      notify("Couldn't reach the server. Please try again.", { variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const acceptInvite = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const { res, data } = await authFetch(`/api/events/${eventId}/team/invites/accept`, {
        method: "POST",
      });
      if (res.status === 401) {
        notify("Your session has expired. Please log in again.", { variant: "error" });
        forceLogout();
        return;
      }
      if (!res.ok) {
        notify(data.message || "Could not accept invite", { variant: "error" });
        return;
      }
      if (data.user) updateUser(data.user);
      if (data.team) setTeamState(data.team);
      notify(data.message || "Joined team", { variant: "success" });
    } catch {
      notify("Couldn't reach the server. Please try again.", { variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const declineInvite = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const { res, data } = await authFetch(`/api/events/${eventId}/team/invites/decline`, {
        method: "POST",
      });
      if (res.status === 401) {
        notify("Your session has expired. Please log in again.", { variant: "error" });
        forceLogout();
        return;
      }
      if (!res.ok) {
        notify(data.message || "Could not decline invite", { variant: "error" });
        return;
      }
      if (data.team) setTeamState(data.team);
      notify("Invite declined", { variant: "info" });
    } catch {
      notify("Couldn't reach the server. Please try again.", { variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 p-3 rounded-lg bg-black/40 border border-cyan-500/20">
        <p className="text-sm opacity-70">Loading team details…</p>
      </div>
    );
  }

  const incoming = teamState && teamState.pendingIncoming;
  const registered = teamState && teamState.registered;
  const canInvite = teamState && teamState.canInvite;
  const maxSize = teamState && teamState.limits ? teamState.limits.max : 5;

  if (incoming && !registered) {
    return (
      <div className="mt-6 p-4 rounded-lg bg-black/40 border border-cyan-500/20 flex flex-col gap-3">
        <span className="text-xs uppercase tracking-wider opacity-70">Team invite</span>
        <p className="text-sm">
          <span className="font-semibold text-cyan-300">
            {incoming.leader && incoming.leader.name ? incoming.leader.name : "Someone"}
          </span>{" "}
          invited you to join their team for this event. Accepting will register you for this event.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={actionLoading}
            onClick={acceptInvite}
            className="px-4 py-2 rounded-lg bg-green-900/40 border border-green-400/40 text-green-200 text-sm font-semibold disabled:opacity-50"
          >
            {actionLoading ? "Working…" : "Accept invite"}
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={declineInvite}
            className="px-4 py-2 rounded-lg border border-white/20 text-sm font-semibold disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  if (!registered) {
    return (
      <div className="mt-6 p-3 rounded-lg bg-black/40 border border-cyan-500/20">
        <span className="block text-xs uppercase tracking-wider opacity-70 mb-1">Team</span>
        <p className="text-sm opacity-70">Add this event first, then you can invite teammates here.</p>
      </div>
    );
  }

  const leaderName =
    teamState.leader && teamState.leader.name ? teamState.leader.name : user.name || "You";
  const members = (teamState.members || []).map((m) => m.name || m.email).filter(Boolean);
  const pending = (teamState.pendingOutgoing || []).map((m) => m.name || m.email).filter(Boolean);

  return (
    <div className="mt-6 p-4 rounded-lg bg-black/40 border border-cyan-500/20 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-wider opacity-70">Team</span>
        <span className="text-xs opacity-60">Up to {maxSize} participants</span>
      </div>

      <p className="text-sm">
        Leader: <span className="font-semibold text-cyan-300">{leaderName}</span>
      </p>
      {members.length > 0 && (
        <p className="text-sm">
          Teammates: <span className="text-white/90">{members.join(", ")}</span>
        </p>
      )}
      {pending.length > 0 && (
        <p className="text-sm opacity-80">
          Pending invites: {pending.join(", ")}
        </p>
      )}
      {teamState.role === "member" && (
        <p className="text-sm opacity-70">You are on this team as a member.</p>
      )}

      {canInvite && (
        <div className="flex flex-col gap-2 pt-2 border-t border-cyan-500/10">
          <label className="text-xs uppercase tracking-wider opacity-70" htmlFor="teammate-email">
            Add teammate (email)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="teammate-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setLookupUser(null);
              }}
              placeholder="friend@college.edu"
              className="flex-1 px-3 py-2 rounded-lg bg-black/50 border border-cyan-500/30 text-sm"
            />
            <button
              type="button"
              disabled={lookupLoading || actionLoading}
              onClick={handleLookup}
              className="px-3 py-2 rounded-lg border border-cyan-500/40 text-sm font-semibold disabled:opacity-50"
            >
              {lookupLoading ? "Finding…" : "Find user"}
            </button>
          </div>
          {lookupUser && (
            <div className="text-sm flex flex-wrap items-center gap-2">
              <span>
                Send invite to{" "}
                <span className="font-semibold text-cyan-300">{lookupUser.name || lookupUser.email}</span>?
              </span>
              <button
                type="button"
                disabled={actionLoading}
                onClick={sendInvite}
                className="px-3 py-1.5 rounded-md bg-cyan-950/60 border border-cyan-400/50 text-xs font-semibold disabled:opacity-50"
              >
                {actionLoading ? "Sending…" : "Send invite"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileEventTeam;
