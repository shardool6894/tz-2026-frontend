import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthManager";
import { useSnackbar } from "../../Context/SnackbarProvider";
import { fetchEvents } from "../Events/eventsData";
import Poster from "../event_scroll/poster";
import { authFetch } from "../utils/authFetch";

const Row = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-3 border-b border-cyan/10 last:border-0">
    <span className="text-sm text-white/60">{label}</span>
    <span className="text-sm font-medium break-words sm:text-right">{value || "—"}</span>
  </div>
);

export const Profile = () => {
  const { user, updateUser, forceLogout } = useAuth();
  const { notify } = useSnackbar();
  const navigate = useNavigate();
  const [allEvents, setAllEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // all events (shared, cached list)
  useEffect(() => {
    let cancelled = false;
    fetchEvents()
      .then((list) => {
        if (!cancelled) setAllEvents(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingEvents(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // refresh the saved copy of the user so the registered events are current
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { res, data } = await authFetch("/api/users/me");
        if (cancelled) return;
        if (res.status === 401) {
          notify("Your session has expired. Please log in again.", { variant: "error" });
          forceLogout();
          return;
        }
        if (res.ok && data.user) updateUser(data.user);
      } catch {
        /* backend asleep or offline: keep showing the saved copy */
      }
    })();
    return () => {
      cancelled = true;
    };
    // run once when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  // user.events holds event ids
  const ids = (Array.isArray(user.events) ? user.events : []).map((e) =>
    String(e && e._id ? e._id : e)
  );
  const byId = new Map(allEvents.filter((e) => e && e._id).map((e) => [String(e._id), e]));
  const registered = ids.map((id) => byId.get(id)).filter(Boolean);
  const unresolved = ids.length - registered.length;
  const members = Array.isArray(user.teamMembers) ? user.teamMembers : [];

  const openEvent = (item) =>
    navigate("/card", {
      state: {
        ...item,
        imgsrc: item.imgsrc || "",
        glink: item.glink || "",
        returnPath: "/profile",
        fromProfile: true,
      },
    });

  return (
    <div className="min-h-screen bg-black text-white px-4 md:px-8 pb-10 pt-24 md:pt-32">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-3xl md:text-4xl font-bold text-cyan text-center">My Profile</h1>

        {/* Personal details */}
        <div className="bg-darkGray rounded-xl p-6 md:p-8 shadow-lg shadow-cyan/10 max-w-3xl mx-auto w-full">
          <h2 className="text-xl font-semibold mb-4 pb-3 border-b border-cyan/30">Personal Details</h2>
          <Row label="Name" value={user.name} />
          <Row label="Email" value={user.email} />
          <Row label="College" value={user.collegeName} />
          <Row label="Registration number" value={user.registrationNum} />
          <Row
            label="Registration type"
            value={user.registrationType === "team" ? "Team" : "Individual"}
          />
          <Row label="Accommodation" value={user.accommodation ? "Requested" : "Not requested"} />
          {members.length > 0 && (
            <Row
              label="Team members"
              value={members.map((m) => m && m.name).filter(Boolean).join(", ")}
            />
          )}
        </div>

        {/* Registered events + Add events */}
        <div className="bg-darkGray rounded-xl p-6 md:p-8 shadow-lg shadow-cyan/10">
          <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-cyan/30">
            <h2 className="text-xl font-semibold">
              Registered Events{" "}
              {ids.length > 0 && <span className="text-cyan/70">({ids.length})</span>}
            </h2>
            <button
              type="button"
              onClick={() => navigate("/profile/add-events")}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-cyan/20 hover:bg-cyan/30 transition"
            >
              + Add events
            </button>
          </div>

          {ids.length === 0 ? (
            <p className="text-white/60 text-sm">
              You haven't registered for any events yet. Use “Add events” to pick some.
            </p>
          ) : loadingEvents ? (
            <p className="text-white/60 text-sm">Loading your events…</p>
          ) : (
            <>
              {registered.length > 0 && (
                <div className="grid lg:grid-cols-4 md:grid-cols-3 grid-cols-2 gap-x-4 gap-y-8">
                  {registered.map((item) => (
                    <Poster
                      key={item._id}
                      imageSrc={item.imgsrc || ""}
                      fallbackSrc=""
                      title={item.name}
                      content={item.club}
                      onClick={() => openEvent(item)}
                    />
                  ))}
                </div>
              )}
              {unresolved > 0 && (
                <p className="mt-4 text-sm text-white/60">
                  {registered.length === 0
                    ? "Event details can't be loaded right now. Please try again in a few minutes."
                    : `${unresolved} registered event(s) couldn't be matched to the current event list.`}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
