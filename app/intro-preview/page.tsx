// Temporary test page for the intro. Not linked from anywhere.
import { Suspense } from "react";
import { IntroPreview } from "./preview";

export default function IntroPreviewPage() {
  return (
    <Suspense>
      <IntroPreview />
    </Suspense>
  );
}
