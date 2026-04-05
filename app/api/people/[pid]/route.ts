import { NextResponse } from "next/server";
import { getPersonById } from "@/lib/data";

type Params = {
  params: Promise<{ pid: string }>;
};

export async function GET(_: Request, { params }: Params) {
  const { pid } = await params;
  const person = getPersonById(pid);
  if (!person) {
    return NextResponse.json({ message: "Person not found" }, { status: 404 });
  }
  return NextResponse.json(person);
}
