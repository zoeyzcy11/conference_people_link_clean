import { NextResponse } from "next/server";
import { getConferenceSeeds } from "@/lib/data";

export async function GET() {
  return NextResponse.json(getConferenceSeeds());
}
