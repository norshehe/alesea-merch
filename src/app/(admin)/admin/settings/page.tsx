import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/features/admin/components/empty-state";
import { PageHeader } from "@/features/admin/components/page-header";
import { SettingsForm } from "@/features/admin/settings/components/settings-form";
import { getAdminSiteSettings } from "@/features/admin/settings/server/settings.queries";
import { SETTINGS_FALLBACK } from "@/features/catalog/server/settings";

/**
 * The `site_settings` singleton.
 *
 * `SETTINGS_FALLBACK` is imported HERE, not in the form: it lives in a
 * `server-only` module, and it is the same object the storefront merges
 * against — duplicating those defaults is how the admin's placeholders end up
 * lying about what an empty field renders.
 */
export default async function SettingsPage() {
  const settings = await getAdminSiteSettings();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Branding, currency, shipping, footer and navigation. An empty field falls back to the built-in default."
      />

      {settings ? (
        <SettingsForm settings={settings} defaults={SETTINGS_FALLBACK} />
      ) : (
        // Should be unreachable: `0003_content.sql` seeds row 1 and its CHECK
        // makes a second row impossible. Missing means the migration never ran.
        <EmptyState
          icon={TriangleAlert}
          title="No settings row"
          description="The site_settings row is missing, so there is nothing to edit. Run the database migrations and reload this page."
        />
      )}
    </>
  );
}
