import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { WebCanvas } from "../bg_animation/bg_animate";
import Poster from "../event_scroll/poster";
import { Loader } from "../Loader/index";
import { fetchEvents } from "../Events/eventsData";
import { useAuth } from "../../Context/AuthManager";
import "../PastEvents/PastEvents.css";
import "../event_scroll/index.css";

const CATEGORY_TABS = [
  { key: "all", label: "ALL" },
  { key: "competition", label: "COMPETITIONS" },
  { key: "game", label: "GAMES" },
  { key: "demonstration", label: "DEMONSTRATIONS" },
];

// Same look as the Events page, but only lists events the user hasn't registered for yet.
export const AddEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetchEvents()
      .then((data) => {
        if (isMounted) setEvents(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Error loading events:", err);
        if (isMounted) setError(err.message || "Failed to load events");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const registeredIds = new Set(
    (Array.isArray(user.events) ? user.events : []).map((e) => String(e && e._id ? e._id : e))
  );

  // the bundled backup list has no _id, so those events can't be added
  const apiDown = !isLoading && !error && events.length > 0 && !events.some((e) => e && e._id);

  const available = events.filter(
    (ev) => ev && ev._id && ev.registrationOpen !== false && !registeredIds.has(String(ev._id))
  );

  const filteredEvents = available.filter((ev) => {
    if (selectedCategory === "all") return true;
    const typeLower = (ev.eventType || "").toLowerCase();
    if (selectedCategory === "competition") return typeLower.includes("competition");
    if (selectedCategory === "game") return typeLower.includes("game") || typeLower.includes("fun");
    if (selectedCategory === "demonstration")
      return typeLower.includes("demonstration") || typeLower.includes("demo");
    return true;
  });

  const eventCount = filteredEvents.length;
  const countLabel =
    isLoading || error ? "EVENTS" : `${eventCount} ${eventCount === 1 ? "EVENT" : "EVENTS"}`;

  const handlePosterClick = (item) => {
    navigate("/card", {
      state: {
        ...item,
        imgsrc: item.imgsrc || "",
        glink: item.glink || "",
        returnPath: "/profile/add-events",
        fromProfile: true,
      },
    });
  };

  return (
    <div className="past-events-root">
      <div className="past-events-canvas">
        <WebCanvas />
      </div>

      <div className="edition-view-container pt-12 md:pt-16">
        <div className="edition-topbar">
          <div className="edition-topbar-row">
            <div className="edition-badge-container">
              <h1 className="edition-title-badge">Add Events</h1>
              <span className="edition-year-pill">{countLabel}</span>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-cyan/20 hover:bg-cyan/30 transition"
              >
                ← Back to profile
              </button>
            </div>

            <div className="tabs my-0">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`tab-button ${selectedCategory === tab.key ? "active" : ""}`}
                  onClick={() => setSelectedCategory(tab.key)}
                  aria-pressed={selectedCategory === tab.key}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="edition-content-body">
          <div className="grid lg:grid-cols-5 md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-x-4 gap-y-8 lg:gap-y-10 lg:m-6 m-3">
            {filteredEvents.map((item) => (
              <Poster
                key={item._id}
                imageSrc={item.imgsrc || ""}
                fallbackSrc=""
                title={item.name}
                content={item.club}
                onClick={() => handlePosterClick(item)}
              />
            ))}
          </div>
          {isLoading && <Loader />}
          {!isLoading && error && <p className="text-center text-red-400 my-8">Error: {error}</p>}
          {apiDown && (
            <p className="text-center opacity-70 my-8">
              Events can't be loaded right now, so adding events is unavailable. Please try again in
              a few minutes.
            </p>
          )}
          {!isLoading && !error && !apiDown && filteredEvents.length === 0 && (
            <p className="text-center opacity-70 my-8">
              {available.length === 0
                ? "You're already registered for every event that is open right now."
                : "No events in this category"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddEvents;
