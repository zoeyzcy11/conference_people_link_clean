import { NextResponse } from "next/server";
import { getWorkshop } from "@/lib/data";

type Params = {
  params: Promise<{ id: string; wsId: string }>;
};

export async function GET(_: Request, { params }: Params) {
  const { id, wsId } = await params;
  const workshop = getWorkshop(id, wsId);
  if (!workshop) {
    return NextResponse.json({ message: "Workshop not found" }, { status: 404 });
  }
  return NextResponse.json(workshop);
}
