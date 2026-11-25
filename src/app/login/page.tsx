import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { PreferenceToggles } from "@/components/preference-toggles";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage() {
  if (process.env.SESSION_SECRET && (await isAuthed())) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-6 flex justify-end">
        <PreferenceToggles />
      </div>
      <LoginForm />
    </main>
  );
}
