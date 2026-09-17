import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/features/admin/components/empty-state";
import { PageHeader } from "@/features/admin/components/page-header";
import { HomeForm } from "@/features/admin/home/components/home-form";
import { getAdminHomeContent } from "@/features/admin/home/server/home.queries";
import { HOME_FALLBACK } from "@/features/catalog/server/home";

/**
 * The `home_content` singleton.
 *
 * `HOME_FALLBACK` is imported HERE, not in the form: it lives in a
 * `server-only` module, and it is the same object the storefront merges
 * against — duplicating that copy is how the admin's placeholders end up lying
 * about what an empty field renders.
 */
export default async function HomePage() {
  const content = await getAdminHomeContent();

  return (
    <>
      <PageHeader
        title="Home page"
        description="Copy and imagery for the storefront home page. An empty field falls back to the built-in default."
      />

      {content ? (
        <HomeForm content={content} defaults={HOME_FALLBACK} />
      ) : (
        // Should be unreachable: `0003_content.sql` seeds row 1 and its CHECK
        // makes a second row impossible. Missing means the migration never ran.
        <EmptyState
          icon={TriangleAlert}
          title="No home content row"
          description="The home_content row is missing, so there is nothing to edit. Run the database migrations and reload this page."
        />
      )}
    </>
  );
}
