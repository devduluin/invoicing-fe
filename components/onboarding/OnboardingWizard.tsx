"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import toast from "react-hot-toast";

import { Button, Stepper } from "@/components/ui";
import OnboardingAside from "./OnboardingAside";
import Step1Company from "./Step1Company";
import Step2Info from "./Step2Info";
import Step3Needs from "./Step3Needs";
import Step4Invite from "./Step4Invite";
import SetupTemplateModal from "./SetupTemplateModal";

import { useOnboardingStore, draftToPayload, type OnboardingDraft } from "@/store/useOnboardingStore";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import { useOnb } from "@/lib/onboardingText";
import { APP_NAME, TOTAL_STEPS, WIZARD_STEPS } from "@/lib/onboarding";
import { extractApiError } from "@/lib/apiError";
import { getMe } from "@/services/authService";
import { setActiveCompanyCookie } from "@/utils/cookies";
import { getRootCookieDomain } from "@/utils/cookieDomain";
import { submitOnboarding } from "@/services/onboardingService";

export default function OnboardingWizard() {
  const { t, tr } = useOnb();
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
  const [leaving, setLeaving] = useState(false);
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

  // The outgoing step fades and slides away first (about 140ms), then the new one animates in.
  const goToStep = (step: number, dir: "next" | "back") => {
    setDirection(dir);
    setLeaving(true);
    window.setTimeout(() => {
      setActiveStep(step);
      setLeaving(false);
    }, 140);
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
      // The company just created is the active one from now on.
      setActiveCompanyCookie(res.company.id, getRootCookieDomain());
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
    <main className="flex min-h-svh w-full bg-[#f4f6fa] bg-[radial-gradient(900px_420px_at_0%_0%,rgba(72,99,230,0.10),transparent_70%)]">
      <section className="flex min-w-0 flex-1 flex-col px-5 py-6 sm:px-10 lg:px-14 lg:py-8">
        <header className="page-in flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_2px_8px_-2px_rgba(72,99,230,0.5)]">
            <FileText className="size-[18px]" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">{APP_NAME}</span>
        </header>

        <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center py-8">
          <div className="page-in [animation-delay:60ms]">
            <p className="mb-3 text-xs font-semibold tracking-wider text-primary-ink uppercase">
              {t("Setup")} · {tr("Langkah", "Step")} {Math.min(activeStep, TOTAL_STEPS)} {tr("dari", "of")} {TOTAL_STEPS}
            </p>
            <Stepper steps={WIZARD_STEPS.map((st) => ({ ...st, label: t(st.label) }))} current={Math.min(activeStep, TOTAL_STEPS)} />
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-white/80 p-5 shadow-[0_1px_2px_rgba(20,30,60,0.05),0_18px_40px_-24px_rgba(20,30,60,0.2)] backdrop-blur sm:p-6">
            <div className="mb-4 flex min-h-6 items-center justify-between">
              {showBack ? (
                <Button variant="link" leftIcon={<ArrowLeft className="size-4" />} onClick={() => goToStep(activeStep - 1, "back")}>
                  {t("Back")}
                </Button>
              ) : (
                <span />
              )}
              {canCancel && !doneCompanyName && (
                <Button variant="link" onClick={cancel} className="text-muted-foreground">
                  {t("Cancel")}
                </Button>
              )}
            </div>

            {!hydrated ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("Loading…")}</p>
            ) : (
              <div
                key={activeStep}
                className={
                  leaving
                    ? cn("opacity-0 transition-all duration-150 ease-in", direction === "next" ? "-translate-x-2" : "translate-x-2")
                    : direction === "next"
                      ? "animate-step-in"
                      : "animate-step-in-back"
                }
              >
                {activeStep === 1 && <Step1Company draft={draft} onNext={next} />}
                {activeStep === 2 && <Step2Info draft={draft} onNext={next} />}
                {activeStep === 3 && <Step3Needs draft={draft} onNext={next} />}
                {activeStep >= 4 && <Step4Invite draft={draft} patch={patch} submitting={submitting} onFinish={finish} />}
              </div>
            )}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            {tr(`Dengan melanjutkan, Anda menyetujui Syarat & Ketentuan dan Kebijakan Privasi ${APP_NAME}.`, `By continuing, you agree to ${APP_NAME}'s Terms & Conditions and Privacy Policy.`)}
          </p>
        </div>
      </section>

      <div className="hidden w-[38%] max-w-[560px] min-w-[340px] lg:flex xl:w-[42%]">
        <OnboardingAside />
      </div>

      {doneCompanyName && (
        <SetupTemplateModal
          companyName={doneCompanyName}
          onYes={() => leave("/dashboard/settings/documents")}
          onNo={() => leave("/dashboard")}
        />
      )}
    </main>
  );
}
