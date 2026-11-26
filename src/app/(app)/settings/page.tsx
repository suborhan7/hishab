import type { Metadata } from "next";
import { logout } from "@/app/actions/auth";
import { Icon } from "@/components/icons";
import { PageTitle } from "@/components/ui";
import { getI18n, getTheme } from "@/i18n/server";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { t } = await getI18n();
  const theme = await getTheme();
  return (
    <>
      <PageTitle title={t("settings.title")} />
      <SettingsForm theme={theme} />
      <div className="card mt-4 p-4">
        <h2 className="font-semibold">{t("settings.install")}</h2>
        <p className="mt-1 text-sm text-muted">{t("settings.installHelp")}</p>
      </div>
      <form action={logout} className="mt-6">
        <button className="btn-ghost w-full">
          <Icon name="logout" /> {t("logout")}
        </button>
      </form>
    </>
  );
}
