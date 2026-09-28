import { NextResponse } from "next/server";
import { brandProfileInputSchema } from "@/lib/schemas";
import {
  BrandOperationError,
  createBrandForCurrentWorkspace,
  getBrandForCurrentWorkspace,
  updateBrandForCurrentWorkspace,
} from "@/lib/brands";

type ParsedBrandInput =
  | { success: true; input: ReturnType<typeof brandProfileInputSchema.parse> }
  | { success: false; response: NextResponse };

async function parseBrandInput(request: Request): Promise<ParsedBrandInput> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 }),
    };
  }

  const parsed = brandProfileInputSchema.safeParse(body);

  if (!parsed.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Invalid brand details.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      ),
    };
  }

  return { success: true, input: parsed.data };
}

function handleBrandError(error: unknown) {
  if (error instanceof Error && error.message === "Unauthorized") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (error instanceof BrandOperationError) {
    if (error.kind === "not-found") {
      return NextResponse.json({ error: "Brand profile not found." }, { status: 404 });
    }

    if (error.kind === "already-exists") {
      return NextResponse.json({ error: "A brand profile already exists." }, { status: 409 });
    }
  }

  return NextResponse.json({ error: "Unable to process the brand profile." }, { status: 500 });
}

export async function GET() {
  try {
    const brand = await getBrandForCurrentWorkspace();

    if (!brand) {
      return NextResponse.json({ error: "Brand profile not found." }, { status: 404 });
    }

    return NextResponse.json({ brand });
  } catch (error) {
    return handleBrandError(error);
  }
}

export async function POST(request: Request) {
  const parsed = await parseBrandInput(request);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const brand = await createBrandForCurrentWorkspace(parsed.input);
    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    return handleBrandError(error);
  }
}

export async function PATCH(request: Request) {
  const parsed = await parseBrandInput(request);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const brand = await updateBrandForCurrentWorkspace(parsed.input);
    return NextResponse.json({ brand });
  } catch (error) {
    return handleBrandError(error);
  }
}