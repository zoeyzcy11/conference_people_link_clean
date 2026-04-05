import { NextResponse } from "next/server";
import { getConferences } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domains = searchParams.getAll("domain");
  const subTracks = searchParams.getAll("subTrack");
  const years = searchParams.getAll("year");
  const cities = searchParams.getAll("city");

  const filtered = getConferences().filter((conference) => {
    const okDomain = domains.length === 0 || domains.includes(conference.domain);
    const okSubTrack = subTracks.length === 0 || subTracks.includes(conference.subTrack);
    const okYear = years.length === 0 || years.includes(String(conference.year));
    const okCity = cities.length === 0 || cities.includes(conference.city);
    return okDomain && okSubTrack && okYear && okCity;
  });

  return NextResponse.json(filtered);
}
