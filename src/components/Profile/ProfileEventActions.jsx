import React, { useState } from "react";
import { useAuth } from "../../Context/AuthManager";
import { useSnackbar } from "../../Context/SnackbarProvider";
import { authFetch } from "../utils/authFetch";

// Shown at the top of the event card when opened from profile: register for this event.
const ProfileEventActions = ({ eventId, onRegistered }) => {
  const { user, updateUser, forceLogout } = useAuth();
  const { notify } = useSnackbar();
  const [saving, setSaving] = useState(false);

  if (!user || !eventId) return null;

  const registered = (Array.isArray(user.events) ? user.events : [])
    .map((e) => String(e && e._id ? e._id : e))
    .includes(String(eventId));

  const addEvent = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { res, data } = await authFetch("/api/users/me/events", {
        method: "POST",
        body: JSON.stringify({ events: [String(eventId)] }),
      });
      if (res.status === 401) {
        notify("Your session has expired. Please log in again.", { variant: "error" });
        forceLogout();
        return;
      }
      if (!res.ok) {
        notify(data.message || "Could not add this event. Please try again.", { variant: "error" });
        return;
      }
      if (data.user) updateUser(data.user);
      if (onRegistered) onRegistered();
      notify("Event added to your registration", { variant: "success" });
    } catch {
      notify("Couldn't reach the server. Please try again in a moment.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-5 flex flex-col gap-3">
      {registered ? (
        <div className="inline-flex self-start items-center gap-2 px-4 py-2 rounded-lg border border-green-400/40 bg-green-900/20 text-green-300 text-sm font-semibold">
          ✓ You're registered for this event
        </div>
      ) : (
        <button
          type="button"
          onClick={addEvent}
          disabled={saving}
          className="self-start px-4 py-2.5 rounded-lg border border-cyan-400 text-cyan-300 bg-cyan-950/40 hover:bg-cyan-500/20 transition text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "Adding..." : "+ Add this event"}
        </button>
      )}
    </div>
  );
};

export default ProfileEventActions;
