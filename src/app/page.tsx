import { redirect } from "next/navigation";
import { DEFAULT_LANGUAGE } from "@/lib/languages";

export default function RootPage() {
  redirect(`/${DEFAULT_LANGUAGE}`);
}
