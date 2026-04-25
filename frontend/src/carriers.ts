// Curated helper to surface check-in / tracking / customer-service links for
// common carriers. We don't hit any airline API directly (enterprise-only);
// instead we deep-link into the carrier's own web properties or into Google's
// flight tracker as a universal fallback.

export type CarrierActions = {
  checkinUrl?: string;
  manageUrl?: string;
  trackUrl?: string;
  supportPhone?: string;
  website?: string;
};

// Normalise an airline name or code ("DL", "delta", "Delta Air Lines") → key
function norm(name: string) {
  return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const AIRLINES: Record<string, CarrierActions> = {
  delta: {
    checkinUrl: "https://www.delta.com/flight-status/checkin",
    manageUrl: "https://www.delta.com/mytrips",
    supportPhone: "+18002211212",
    website: "https://www.delta.com",
  },
  dl: {
    checkinUrl: "https://www.delta.com/flight-status/checkin",
    manageUrl: "https://www.delta.com/mytrips",
    supportPhone: "+18002211212",
    website: "https://www.delta.com",
  },
  americanairlines: {
    checkinUrl: "https://www.aa.com/reservation/find-your-reservation",
    manageUrl: "https://www.aa.com/reservation/find-your-reservation",
    supportPhone: "+18004337300",
    website: "https://www.aa.com",
  },
  aa: {
    checkinUrl: "https://www.aa.com/reservation/find-your-reservation",
    manageUrl: "https://www.aa.com/reservation/find-your-reservation",
    supportPhone: "+18004337300",
    website: "https://www.aa.com",
  },
  united: {
    checkinUrl: "https://www.united.com/en-us/checkin",
    manageUrl: "https://www.united.com/en/us/manageres/mytrips",
    supportPhone: "+18008648331",
    website: "https://www.united.com",
  },
  ua: {
    checkinUrl: "https://www.united.com/en-us/checkin",
    manageUrl: "https://www.united.com/en/us/manageres/mytrips",
    supportPhone: "+18008648331",
    website: "https://www.united.com",
  },
  southwest: {
    checkinUrl: "https://www.southwest.com/air/check-in/",
    manageUrl: "https://www.southwest.com/air/manage-reservation/",
    supportPhone: "+18004359792",
    website: "https://www.southwest.com",
  },
  wn: {
    checkinUrl: "https://www.southwest.com/air/check-in/",
    manageUrl: "https://www.southwest.com/air/manage-reservation/",
    supportPhone: "+18004359792",
    website: "https://www.southwest.com",
  },
  jetblue: {
    checkinUrl: "https://checkin.jetblue.com/",
    manageUrl: "https://www.jetblue.com/manage-trips",
    supportPhone: "+18005382583",
    website: "https://www.jetblue.com",
  },
  b6: {
    checkinUrl: "https://checkin.jetblue.com/",
    manageUrl: "https://www.jetblue.com/manage-trips",
    supportPhone: "+18005382583",
    website: "https://www.jetblue.com",
  },
  spirit: {
    checkinUrl: "https://www.spirit.com/check-in",
    manageUrl: "https://www.spirit.com/manage-travel",
    supportPhone: "+18557283555",
    website: "https://www.spirit.com",
  },
  alaska: {
    checkinUrl: "https://www.alaskaair.com/check-in",
    manageUrl: "https://www.alaskaair.com/manage",
    supportPhone: "+18002527522",
    website: "https://www.alaskaair.com",
  },
  frontier: {
    checkinUrl: "https://www.flyfrontier.com/check-in/",
    manageUrl: "https://www.flyfrontier.com/manage-trip/",
    supportPhone: "+18014015490",
    website: "https://www.flyfrontier.com",
  },
  hawaiian: {
    checkinUrl: "https://www.hawaiianairlines.com/flight-check-in",
    manageUrl: "https://www.hawaiianairlines.com/manage-your-trip",
    supportPhone: "+18003675320",
    website: "https://www.hawaiianairlines.com",
  },
  britishairways: {
    checkinUrl: "https://www.britishairways.com/travel/olcilandingpageauthreq/public/en_us",
    manageUrl: "https://www.britishairways.com/travel/managebooking/public/en_us",
    supportPhone: "+18002479297",
    website: "https://www.britishairways.com",
  },
  ba: {
    checkinUrl: "https://www.britishairways.com/travel/olcilandingpageauthreq/public/en_us",
    manageUrl: "https://www.britishairways.com/travel/managebooking/public/en_us",
    website: "https://www.britishairways.com",
  },
  lufthansa: {
    checkinUrl: "https://www.lufthansa.com/us/en/online-check-in",
    manageUrl: "https://www.lufthansa.com/us/en/my-bookings",
    supportPhone: "+18006455000",
    website: "https://www.lufthansa.com",
  },
  airfrance: {
    checkinUrl: "https://wwws.airfrance.us/online-check-in",
    manageUrl: "https://wwws.airfrance.us/manage-trips",
    supportPhone: "+18002372747",
    website: "https://www.airfrance.us",
  },
  emirates: {
    checkinUrl: "https://www.emirates.com/us/english/manage-booking/online-check-in/",
    manageUrl: "https://www.emirates.com/us/english/manage-booking/",
    supportPhone: "+18007773999",
    website: "https://www.emirates.com",
  },
  qatarairways: {
    checkinUrl: "https://www.qatarairways.com/en-us/manage-booking.html",
    manageUrl: "https://www.qatarairways.com/en-us/manage-booking.html",
    supportPhone: "+18777773553",
    website: "https://www.qatarairways.com",
  },
  aircanada: {
    checkinUrl: "https://www.aircanada.com/us/en/aco/home/book/manage-bookings.html",
    manageUrl: "https://www.aircanada.com/us/en/aco/home/book/manage-bookings.html",
    supportPhone: "+18882472262",
    website: "https://www.aircanada.com",
  },
  klm: {
    checkinUrl: "https://www.klm.com/travel/us_en/prepare_for_travel/checkin_options/index.htm",
    manageUrl: "https://www.klm.com/travel/us_en/apps/ebt/ebt_identification.htm",
    supportPhone: "+18006182000",
    website: "https://www.klm.com",
  },
  iberia: {
    checkinUrl: "https://www.iberia.com/us/online-check-in/",
    manageUrl: "https://www.iberia.com/us/manage-booking/",
    website: "https://www.iberia.com",
  },
};

const TRAINS: Record<string, CarrierActions> = {
  amtrak: {
    manageUrl: "https://www.amtrak.com/servlet/ContentServer?c=Page&pagename=am/Layout&cid=1241245669222",
    supportPhone: "+18008727245",
    trackUrl: "https://www.amtrak.com/track-your-train",
    website: "https://www.amtrak.com",
  },
  eurostar: {
    manageUrl: "https://www.eurostar.com/uk-en/manage-booking",
    website: "https://www.eurostar.com",
  },
  sncf: {
    manageUrl: "https://www.sncf-connect.com/en-en/account/tickets",
    website: "https://www.sncf-connect.com",
  },
  trenitalia: {
    manageUrl: "https://www.trenitalia.com/en.html",
    website: "https://www.trenitalia.com",
  },
  renfe: {
    manageUrl: "https://www.renfe.com/es/en.html",
    website: "https://www.renfe.com",
  },
  deutschebahn: {
    manageUrl: "https://int.bahn.de/en/bookings",
    website: "https://int.bahn.de",
  },
};

const BUSES: Record<string, CarrierActions> = {
  greyhound: {
    manageUrl: "https://www.greyhound.com/en-us/manage-my-booking",
    supportPhone: "+18002319222",
    website: "https://www.greyhound.com",
  },
  megabus: {
    manageUrl: "https://us.megabus.com/manage-my-trip",
    website: "https://us.megabus.com",
  },
  flixbus: {
    manageUrl: "https://www.flixbus.com/account/login",
    website: "https://www.flixbus.com",
  },
  peterpan: {
    manageUrl: "https://peterpanbus.com/",
    supportPhone: "+18003432040",
    website: "https://peterpanbus.com",
  },
};

const CARS: Record<string, CarrierActions> = {
  hertz: {
    manageUrl: "https://www.hertz.com/rentacar/reservation/review",
    supportPhone: "+18006543131",
    website: "https://www.hertz.com",
  },
  avis: {
    manageUrl: "https://www.avis.com/en/reservation/view-modify-cancel",
    supportPhone: "+18002303898",
    website: "https://www.avis.com",
  },
  enterprise: {
    manageUrl: "https://legacy.enterprise.com/car_rental/deeplinkmap.do?bid=028&linkType=viewReservation",
    supportPhone: "+18555663222",
    website: "https://www.enterprise.com",
  },
  budget: {
    manageUrl: "https://www.budget.com/en/reservation/view-modify-cancel",
    supportPhone: "+18002184664",
    website: "https://www.budget.com",
  },
  alamo: {
    manageUrl: "https://www.alamo.com/en/reservation/view-modify-cancel-reservation.html",
    supportPhone: "+18446131910",
    website: "https://www.alamo.com",
  },
  national: {
    manageUrl: "https://www.nationalcar.com/en/reservation/view-modify-cancel-reservation.html",
    supportPhone: "+18004687/",
    website: "https://www.nationalcar.com",
  },
  sixt: {
    manageUrl: "https://www.sixt.com/myaccount/bookings",
    website: "https://www.sixt.com",
  },
  uber: {
    manageUrl: "https://m.uber.com/go/pickup",
    website: "https://www.uber.com",
  },
  lyft: {
    manageUrl: "https://ride.lyft.com",
    website: "https://www.lyft.com",
  },
};

const FERRIES: Record<string, CarrierActions> = {
  carnival: {
    manageUrl: "https://www.carnival.com/BookingEngine/ManageBooking",
    supportPhone: "+18007645500",
    website: "https://www.carnival.com",
  },
  royalcaribbean: {
    manageUrl: "https://www.royalcaribbean.com/account/upcoming-cruises",
    supportPhone: "+18663624603",
    website: "https://www.royalcaribbean.com",
  },
  stenaline: {
    manageUrl: "https://www.stenaline.co.uk/customer-service/manage-my-booking",
    website: "https://www.stenaline.co.uk",
  },
  dfds: {
    manageUrl: "https://www.dfds.com/en/passenger-ferries/manage-booking",
    website: "https://www.dfds.com",
  },
};

export function getCarrierActions(
  transportType: string | undefined,
  operator: string | undefined,
  flightNumber?: string
): CarrierActions {
  const t = (transportType || "flight").toLowerCase();
  const key = norm(operator || "");
  let specific: CarrierActions = {};
  if (t === "flight") specific = AIRLINES[key] || {};
  else if (t === "train") specific = TRAINS[key] || {};
  else if (t === "bus" || t === "shuttle") specific = BUSES[key] || {};
  else if (t === "car" || t === "rideshare") specific = CARS[key] || {};
  else if (t === "ferry") specific = FERRIES[key] || {};

  // Universal fallbacks via Google
  const googleQ = encodeURIComponent(
    `${operator || ""} ${flightNumber || ""} ${t === "flight" ? "flight status" : t + " tracking"}`.trim()
  );
  const fallbackTrack = `https://www.google.com/search?q=${googleQ}`;
  const fallbackCheckin = `https://www.google.com/search?q=${encodeURIComponent(
    `${operator || ""} online check-in`
  )}`;

  return {
    checkinUrl: specific.checkinUrl || (t === "flight" ? fallbackCheckin : undefined),
    manageUrl: specific.manageUrl,
    trackUrl: specific.trackUrl || fallbackTrack,
    supportPhone: specific.supportPhone,
    website: specific.website,
  };
}
