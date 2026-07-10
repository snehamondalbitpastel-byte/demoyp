import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Job-details proxy.
 *
 * Body: `{ id }` (job id). Returns the full job record:
 *   { status, message, data: {
 *       id, title, company_id, company_name, company_logo_url,
 *       company_color_url, company_description, company_address,
 *       jobsector_id, job_sector, description, requirements,
 *       work_type, salary_range, employment_type, created_at,
 *       updated_at, keywords, start_date, end_date, job_link,
 *       job_role: { role, description, explanation, skills },
 *       saved_jobs, applied_jobs, location: string[],
 *       jopost_image_url
 *   }}
 *
 * The `description` and `company_description` fields are HTML and
 * are rendered with `dangerouslySetInnerHTML` on the details page.
 * `saved_jobs` / `applied_jobs` are stringified booleans ("1"/"0")
 * indicating whether the current viewer has saved/applied to this job.
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/job", {
    attachBearerToken: true,
  });
}
