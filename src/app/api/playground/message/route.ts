import { POST as handlePlaygroundMessage } from "@/app/api/playground/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handlePlaygroundMessage(request);
}
