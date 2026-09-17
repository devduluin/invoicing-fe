"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import toast from "react-hot-toast";

import { Button, Card, Stepper } from "@/components/ui";
import OnboardingAside from "./OnboardingAside";
import Step1Company from "./Step1Company";
import Step2Info from "./Step2Info";
import Step3Needs from "./Step3Needs";
import Step4Invite from "./Step4Invite";
import SetupTemplateModal from "./SetupTemplateModal";

import { useOnboardingStore, draftToPayload, type OnboardingDraft } from "@/store/useOnboardingStore";
import { useAuthStore } from "@/store/useAuthStore";
import { APP_NAME, TOTAL_STEPS, WIZARD_STEPS } from "@/lib/onboarding";
import { extractApiError } from "@/lib/apiError";
import { getMe } from "@/services/authService";
import { submitOnboarding } from "@/services/onboardingService";

export default function OnboardingWizard() {
  const router = useRouter();
  // ?new=1 → deliberately creating an additional company; don't bounce even
  // though the user already has one.
  const isNew = useSearchParams().get("new") === "1";

  const { draft, activeStep, submitting, patch, setActiveStep, setSubmitting, reset } =
    useOnboardingStore();
  const companies = useAuthStore((s) => s.companies);
  const setAuthUser = useAuthStore((s) => s.setUser);

  const [hydrated, setHydrated] = useState(false);
  const [direction, setDirection] = useState<"next" | "back">("next");
  const [doneCompanyName, setDoneCompanyName] = useState<string | null>(null);
  const didInit = useRef(false);

  // First mount: the persisted draft is already rehydrated (sync localStorage).
  // "Create another company" (?new=1) always starts from a clean draft; a
  // first-time user resumes whatever they left behind.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (isNew) reset();
    setHydrated(true);
  }, [isNew, reset]);

  // Already onboarded and hit /onboarding without ?new=1 → back to the dashboard.
  // (AuthInitializer also enforces this; this keeps the blank wizard from
  //  flashing while /me resolves.)
  useEffect(() => {
    if (!isNew && !doneCompanyName && companies.some((c) => c.onboardingStatus === "active")) {
      router.replace("/dashboard");
    }
  }, [isNew, doneCompanyName, companies, router]);

  const canCancel = companies.length > 0;

  const goToStep = (step: number, dir: "next" | "back") => {
    setDirection(dir);
    setActiveStep(step);
  };

  const next = (p: Partial<OnboardingDraft>) => {
    patch(p);
    goToStep(Math.min(activeStep + 1, TOTAL_STEPS), "next");
  };

  const cancel = () => {
    reset();
    router.push("/dashboard");
  };

  const finish = async () => {
    setSubmitting(true);
    try {
      const res = await submitOnboarding(draftToPayload(draft));
      if (res.failed_invites?.length) {
        toast.error(`${res.failed_invites.length} invitation(s) failed to send — you can retry from the Team menu.`);
      }
      setDoneCompanyName(res.company.name);
      reset();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to save onboarding"));
    } finally {
      setSubmitting(false);
    }
  };

  const leave = async (to: string) => {
    try {
      setAuthUser(await getMe());
    } catch {
      /* dashboard will re-fetch */
    }
    router.replace(to);
  };

  const showBack = activeStep > 1 && !doneCompanyName;

  return (
    <main className="flex min-h-svh w-full bg-gradient-to-b from-background to-accent">
      <section className="flex w-full flex-col items-center justify-center px-4 py-8 sm:px-6 lg:w-[58%]">
        <div className="w-full max-w-[480px]">
          <header className="mb-6 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <FileText className="size-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-foreground">{APP_NAME}</span>
          </header>

          <Card>
            <div className="mb-7 flex min-h-6 items-center justify-between">
              {showBack ? (
                <Button
                  variant="link"
                  leftIcon={<ArrowLeft className="size-4" />}
                  onClick={() => goToStep(activeStep - 1, "back")}
                >
                  Back
                </Button>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">
                  Step {Math.min(activeStep, TOTAL_STEPS)} of {TOTAL_STEPS}
                </span>
              )}
              {canCancel && !doneCompanyName && (
                <Button variant="link" onClick={cancel} className="text-muted-foreground">
                  Cancel
                </Button>
              )}
            </div>

            <div className="mb-8">
              <Stepper steps={WIZARD_STEPS} current={Math.min(activeStep, TOTAL_STEPS)} />
            </div>

            {!hydrated ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div
                key={activeStep}
                className={direction === "next" ? "animate-step-in" : "animate-step-in-back"}
              >
                {activeStep === 1 && <Step1Company draft={draft} onNext={next} />}
                {activeStep === 2 && <Step2Info draft={draft} onNext={next} />}
                {activeStep === 3 && <Step3Needs draft={draft} onNext={next} />}
                {activeStep >= 4 && (
                  <Step4Invite
                    draft={draft}
                    patch={patch}
                    submitting={submitting}
                    onFinish={finish}
                  />
                )}
              </div>
            )}
          </Card>

          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
            By continuing, you agree to {APP_NAME}&apos;s Terms &amp; Conditions and Privacy
            Policy.
          </p>
        </div>
      </section>

      <OnboardingAside />

      {doneCompanyName && (
        <SetupTemplateModal
          companyName={doneCompanyName}
          onYes={() => leave("/dashboard?setup=invoice-template")}
          onNo={() => leave("/dashboard")}
        />
      )}
    </main>
  );
}
