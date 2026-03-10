import LinkBulkInput from "@/components/LinkBulkInput";

export default function DashboardPage() {
  function handleImportLinks(links: string[]) {
    // TODO: Implement import logic (create orders / queue scraping)
    console.log("Imported links:", links);
  }

  return (
    <div>
      <div className="mt-6 max-w-2xl mx-auto">
        <h3 className="text-lg font-medium">Bulk import links</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Paste a list of product links to create orders in bulk.</p>
        <LinkBulkInput onImport={handleImportLinks} />
      </div>
    </div>
  );
}
