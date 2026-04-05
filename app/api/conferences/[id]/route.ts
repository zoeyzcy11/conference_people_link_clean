import { NextResponse } from "next/server";
import { getConferenceById } from "@/lib/data";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const conference = getConferenceById(id);
  if (!conference) {
    return NextResponse.json({ message: "Conference not found" }, { status: 404 });
  }
  return NextResponse.json(conference);
}
