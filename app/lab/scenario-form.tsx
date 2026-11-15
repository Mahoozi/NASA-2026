"use client";
// Person A — presets, sliders and fields for the scenario, plus the share/print actions.
import { useState } from "react";
import Link from "next/link";
import { LinkIcon, PrinterIcon, XIcon } from "lucide-react";
import type { MaterialFamily, SafetyArea, Scenario } from "@/lib/schema";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GRAVITIES,
  GRAVITY_LABEL,
  MATERIAL_FAMILIES,
  PRESSURE_CONTEXT_NOTE,
  SAFETY_AREAS,
  scenarioToQuery,
  type Preset,
} from "./scenario";
import { reportHref } from "./report/report";

type Props = {
  scenario: Scenario;
  presets: Preset[];
  onChange: (next: Scenario) => void;
  /** Called after a preset is applied, so the page can bring the results into view. */
  onPreset?: () => void;
};

/** Same scenario, field for field (the URL form is canonical). */
const sameScenario = (a: Scenario, b: Scenario) => scenarioToQuery(a) === scenarioToQuery(b);
const PSI_TO_KPA = 6.894757;

export function ScenarioForm({ scenario, presets, onChange, onPreset }: Props) {
  const set = <K extends keyof Scenario>(key: K, value: Scenario[K]) => {
    const next = { ...scenario, [key]: value };
    if (value === undefined) delete next[key];
    onChange(next);
  };
  // Moon Base and the rover share one scenario, so the button last pressed wins a tie.
  const [picked, setPicked] = useState<string | null>(null);
  const active =
    presets.find((p) => p.id === picked && sameScenario(p.scenario, scenario)) ??
    presets.find((p) => sameScenario(p.scenario, scenario));
  const [copyNote, setCopyNote] = useState("");
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyNote("Link copied");
    } catch {
      setCopyNote("Could not copy; the link is in the address bar");
    }
    window.setTimeout(() => setCopyNote(""), 2500);
  };
  const { o2Pct: o2, pressurePsi: psi } = scenario;

  return (
    <div className="flex flex-col gap-6 rounded-lg border bg-card/60 p-4 backdrop-blur-sm sm:p-6">
      <FieldSet>
        <FieldLegend>Presets</FieldLegend>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Button
              key={p.id}
              variant={active?.id === p.id ? "default" : "outline"}
              aria-pressed={active?.id === p.id}
              onClick={() => {
                setPicked(p.id);
                onChange(p.scenario);
                onPreset?.();
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
        {active && (
          <p className="text-sm text-muted-foreground">
            Source: <PresetSource preset={active} />
          </p>
        )}
        <details className="text-sm text-muted-foreground">
          <summary className="w-fit cursor-pointer hover:text-foreground">Sources for every preset</summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {presets.map((p) => (
              <li key={p.id}>
                <span className="font-medium text-foreground">{p.label}:</span> <PresetSource preset={p} />
              </li>
            ))}
          </ul>
        </details>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Scenario</FieldLegend>
        <FieldGroup className="grid gap-6 sm:grid-cols-3">
          <SliderField
            id="o2"
            label="Oxygen (% by volume)"
            unit="%"
            min={0}
            max={100}
            step={0.1}
            value={o2}
            onChange={(v) => set("o2Pct", v)}
            description={
              o2 !== undefined && psi !== undefined
                ? `O₂ partial pressure ${((o2 / 100) * psi * PSI_TO_KPA).toFixed(1)} kPa (O₂% × pressure; context, not scored).`
                : undefined
            }
          />
          <SliderField
            id="flow"
            label="Airflow (cm/s)"
            unit="cm/s"
            min={0}
            max={60}
            step={0.5}
            value={scenario.flowCmS}
            onChange={(v) => set("flowCmS", v)}
          />
          <SliderField
            id="pressure"
            label="Pressure (psi)"
            unit="psi"
            min={0}
            max={15}
            step={0.1}
            value={psi}
            onChange={(v) => set("pressurePsi", v)}
            description={
              psi !== undefined
                ? `${(psi * PSI_TO_KPA).toFixed(1)} kPa. ${PRESSURE_CONTEXT_NOTE}`
                : PRESSURE_CONTEXT_NOTE
            }
          />
        </FieldGroup>
        <FieldGroup className="grid gap-4 sm:grid-cols-3">
          <OptionField
            id="material"
            label="Material"
            anyLabel="Any material"
            options={MATERIAL_FAMILIES.map((f) => ({ label: f, value: f }))}
            value={scenario.materialFamily ?? null}
            onChange={(v) => set("materialFamily", (v ?? undefined) as MaterialFamily | undefined)}
          />
          <OptionField
            id="gravity"
            label="Gravity"
            anyLabel="Any gravity"
            options={GRAVITIES.map((g) => ({ label: GRAVITY_LABEL[g], value: g }))}
            value={scenario.gravity ?? null}
            onChange={(v) => set("gravity", (v ?? undefined) as Scenario["gravity"])}
          />
          <OptionField
            id="area"
            label="Safety area"
            anyLabel="Any safety area"
            options={SAFETY_AREAS.map((a) => ({ label: a, value: a }))}
            value={scenario.safetyArea ?? null}
            onChange={(v) => set("safetyArea", (v ?? undefined) as SafetyArea | undefined)}
          />
        </FieldGroup>
      </FieldSet>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={copyLink}>
          <LinkIcon data-icon="inline-start" />
          Copy scenario link
        </Button>
        <Link href={reportHref(scenario)} className={buttonVariants({ variant: "outline" })}>
          <PrinterIcon data-icon="inline-start" />
          Print or save as PDF
        </Link>
        <Button variant="ghost" onClick={() => onChange({})}>
          Clear scenario
        </Button>
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {copyNote}
        </span>
      </div>
    </div>
  );
}

function PresetSource({ preset }: { preset: Preset }) {
  return preset.sourceUrl ? (
    <a
      href={preset.sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-4 hover:text-foreground"
    >
      {preset.source}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    <>{preset.source}</>
  );
}

/**
 * Slider with a live readout and a number box. "Any" (unset, so not scored) is its own
 * state: the slider is dimmed until moved, and the × button returns the field to Any.
 */
function SliderField({
  id,
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  description,
}: {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  description?: string;
}) {
  const unset = value === undefined;
  return (
    <Field>
      <div className="flex items-baseline justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <span className="font-medium text-primary tabular-nums" aria-hidden>
          {unset ? "Any" : `${value} ${unit}`}
        </span>
      </div>
      <input
        type="range"
        aria-label={`${label} slider`}
        min={min}
        max={max}
        step={step}
        value={unset ? (min + max) / 2 : Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`h-2 w-full cursor-pointer accent-(--primary) ${unset ? "opacity-35" : ""}`}
      />
      <div className="flex items-center gap-2">
        <NumberField id={id} step={step} value={value} onChange={onChange} />
        {!unset && (
          <Button variant="ghost" size="icon" aria-label={`Set ${label} back to Any`} onClick={() => onChange(undefined)}>
            <XIcon />
          </Button>
        )}
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}

function OptionField({
  id,
  label,
  anyLabel,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  anyLabel: string;
  options: { label: string; value: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const items = [{ label: anyLabel, value: null as string | null }, ...options];
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select items={items} value={value} onValueChange={(v) => onChange(v as string | null)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value ?? "any"} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

/**
 * Number input that keeps the user's partial text ("17.") while the URL holds
 * the parsed number, and follows the URL when a preset or "clear" changes it.
 */
function NumberField({
  id,
  step,
  value,
  onChange,
}: {
  id: string;
  step: number;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    const typed = text.trim() === "" ? undefined : Number(text);
    if (typed !== value) setText(value === undefined ? "" : String(value));
  }

  return (
    <Input
      id={id}
      name={id}
      autoComplete="off"
      type="number"
      inputMode="decimal"
      step={step}
      min={0}
      value={text}
      placeholder="Any"
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw.trim() === "") return onChange(undefined);
        const n = Number(raw);
        if (Number.isFinite(n)) onChange(n);
      }}
    />
  );
}
