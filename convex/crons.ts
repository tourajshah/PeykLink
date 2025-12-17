import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
    "archive-expired-requests",
    { hours: 24 },
    internal.requests.archiveExpired,
);

crons.interval(
    "archive-expired-trips",
    { hours: 24 },
    internal.trips.archiveExpired,
);

crons.interval(
    "share-onhold-reviews",
    { hours: 36 },
    internal.reviews.makeReviewsPublic,
);


crons.daily(
    "hard-delete-trash-requests",
    { hourUTC: 0, minuteUTC: 0 },
    internal.requests.cleanupDeletedRequests
);

crons.daily(
    "hard-delete-trash-trips",
    { hourUTC: 0, minuteUTC: 0 },
    internal.trips.cleanupDeletedTrips
);

export default crons;