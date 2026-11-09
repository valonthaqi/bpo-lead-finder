import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in · BPO Lead Finder",
};

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm pt-4 sm:pt-12">
      <LoginForm />
    </div>
  );
}
